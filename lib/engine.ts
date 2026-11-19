import { FX_FROM_NGN, INGREDIENTS, RECIPE_BY_ID, RECIPE_LIBRARY, type PriceOverrides } from "./food-data";
import type {
  Currency,
  GroceryItem,
  GroceryList,
  IngredientLine,
  MealPlan,
  MealPlanDay,
  MealSlot,
  Nutrition,
  PantryItem,
  Preferences,
  Recipe,
  ScheduledMeal,
} from "./types";
import { addDaysISO, round2, todayISO } from "./utils";

// Deterministic planning engine: costs, nutrition, grocery consolidation and
// meal scheduling. The AI layer never authoritatively computes these values.

// ------------------------------- costs -------------------------------------

export function pricePerBase(ingredient: string, currency: string, overrides?: PriceOverrides) {
  const meta = INGREDIENTS[ingredient];
  if (!meta) return null;
  const ngn = overrides?.[ingredient] ?? meta.ngnPerBase;
  const factor = FX_FROM_NGN[currency] ?? 1;
  return { perBase: ngn * factor, base: meta.base, meta };
}

export function toBase(ingredient: string, qty: number, unit: string): { qty: number; base: "g" | "ml" | "piece" } | null {
  const meta = INGREDIENTS[ingredient];
  if (!meta) return null;
  const u = unit.toLowerCase().trim();
  let baseQty: number | null = null;
  if (u === "g") baseQty = meta.base === "g" ? qty : null;
  else if (u === "kg") baseQty = meta.base === "g" ? qty * 1000 : null;
  else if (u === "ml") baseQty = meta.base === "ml" ? qty : null;
  else if (u === "litre" || u === "l") baseQty = meta.base === "ml" ? qty * 1000 : null;
  else if (u === "piece" || u === "pieces") {
    if (meta.base === "piece") baseQty = qty;
    else if (meta.pieceG) baseQty = qty * meta.pieceG;
  } else if (u === "cup") {
    if (meta.base === "g" && meta.cupG) baseQty = qty * meta.cupG;
    else if (meta.base === "ml") baseQty = qty * 240;
  } else if (u === "tbsp") {
    if (meta.base === "g" && meta.cupG) baseQty = qty * (meta.cupG / 16);
    else if (meta.base === "ml") baseQty = qty * 15;
  } else if (u === "bunch") {
    if (meta.bunchG) baseQty = qty * meta.bunchG;
  } else if (u === "derica") {
    if (meta.base === "g") baseQty = qty * 330;
  } else if (u === "paint bucket") {
    if (meta.base === "g") baseQty = qty * 1800;
  } else if (u === "mudu") {
    if (meta.base === "g") baseQty = qty * 300;
  }
  if (baseQty === null) return null;
  return { qty: baseQty, base: meta.base };
}

export function lineCost(line: IngredientLine, currency: string, overrides?: PriceOverrides): number | null {
  const p = pricePerBase(line.item, currency, overrides);
  const conv = p ? toBase(line.item, line.qty, line.unit) : null;
  if (!p || !conv) return null;
  return round2(conv.qty * p.perBase);
}

export function costOfRecipe(recipe: Recipe, currency: string, overrides?: PriceOverrides): number {
  let total = 0;
  for (const line of recipe.ingredients) {
    if (line.optional) continue;
    const c = lineCost(line, currency, overrides);
    if (c !== null) total += c;
  }
  return round2(total);
}

// ------------------------------- nutrition ---------------------------------

export const NUTRITION_SOURCE = "fixture_estimate" as const;

export function scaleNutrition(n: Nutrition, servings: number): Nutrition {
  return {
    calories: round2(n.calories * servings),
    protein: round2(n.protein * servings),
    carbs: round2(n.carbs * servings),
    fat: round2(n.fat * servings),
    fiber: round2(n.fiber * servings),
  };
}

export function sumNutrition(list: Nutrition[]): Nutrition {
  return list.reduce<Nutrition>(
    (a, n) => ({
      calories: round2(a.calories + n.calories),
      protein: round2(a.protein + n.protein),
      carbs: round2(a.carbs + n.carbs),
      fat: round2(a.fat + n.fat),
      fiber: round2(a.fiber + n.fiber),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

export function dayNutrition(day: MealPlanDay): Nutrition {
  return sumNutrition(day.meals.map((m) => scaleNutrition(m.perServingNutrition, m.servings)));
}

export function planNutrition(plan: MealPlan): Nutrition {
  return sumNutrition(plan.days.map(dayNutrition));
}

// ------------------------------- grocery -----------------------------------

const CATEGORY_MAP: Record<string, string> = {
  grains: "Grains and cereals",
  legumes: "Legumes",
  meat: "Meat and poultry",
  fish: "Fish and seafood",
  dairy: "Dairy",
  vegetables: "Vegetables",
  fruits: "Fruits",
  spices: "Spices and seasonings",
  oils: "Oils and cooking essentials",
  beverages: "Beverages",
  other: "Other",
};

function friendlyQty(qty: number, base: "g" | "ml" | "piece"): { qty: number; unit: string } {
  if (base === "g") return qty >= 1000 ? { qty: round2(qty / 1000), unit: "kg" } : { qty: Math.round(qty), unit: "g" };
  if (base === "ml") return qty >= 1000 ? { qty: round2(qty / 1000), unit: "litre" } : { qty: Math.round(qty), unit: "ml" };
  return { qty: Math.ceil(qty), unit: "piece" };
}

export function buildGroceryList(plan: MealPlan, pantry: PantryItem[], overrides?: PriceOverrides): GroceryList {
  const totals = new Map<string, number>();
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const recipe = RECIPE_BY_ID.get(meal.recipeId);
      if (!recipe) continue;
      const factor = meal.servings / recipe.servingsBase;
      for (const line of recipe.ingredients) {
        if (line.optional) continue;
        const conv = toBase(line.item, round2(line.qty * factor), line.unit);
        if (!conv) continue;
        totals.set(line.item, (totals.get(line.item) ?? 0) + conv.qty);
      }
    }
  }

  const pantryNames = new Set(pantry.map((p) => p.name.toLowerCase().trim()));
  const items: GroceryItem[] = [];
  for (const [ingredient, baseQty] of totals) {
    if (pantryNames.has(ingredient) || [...pantryNames].some((n) => n.includes(ingredient) || ingredient.includes(n))) continue;
    const meta = INGREDIENTS[ingredient];
    if (!meta) continue;
    const p = pricePerBase(ingredient, plan.currency, overrides);
    const friendly = friendlyQty(baseQty, meta.base);
    items.push({
      id: `gi_${Math.random().toString(36).slice(2, 10)}`,
      name: meta.display,
      category: CATEGORY_MAP[meta.category] ?? "Other",
      qty: friendly.qty,
      unit: friendly.unit,
      estimatedCost: p ? round2(baseQty * p.perBase) : 0,
      purchased: false,
      fromPantry: false,
    });
  }
  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return {
    id: `gl_${Math.random().toString(36).slice(2, 12)}`,
    userId: plan.userId,
    mealPlanId: plan.id,
    title: `Shopping list — ${plan.title}`,
    createdAt: new Date().toISOString(),
    currency: plan.currency,
    items,
    estimatedTotal: round2(items.reduce((s, i) => s + i.estimatedCost, 0)),
  };
}

export function groceryCsv(list: GroceryList): string {
  const rows: string[][] = [["Item", "Quantity", "Category", `Estimated cost (${list.currency})`, "Purchased"]];
  for (const i of list.items) rows.push([i.name, `${i.qty} ${i.unit}`, i.category, String(i.estimatedCost), i.purchased ? "yes" : "no"]);
  rows.push(["TOTAL", "", "", String(list.estimatedTotal), ""]);
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// ------------------------------- planner -----------------------------------

export type PlanRequest = {
  raw: string;
  days: number;
  meals: MealSlot[];
  people: number;
  budgetAmount: number | null;
  budgetPeriod: "daily" | "weekly" | "monthly" | null;
  currency: Currency;
  goal: string;
  restrictions: string[];
  allergies: string[];
  refusedFoods: string[];
  cuisines: string[];
  maxMinutes: number | null;
};

export function defaultPreferences(userId: string): Preferences {
  return {
    userId,
    displayName: "",
    country: "Nigeria",
    city: "",
    language: "en",
    currency: "NGN",
    timezone: "Africa/Lagos",
    household: { type: "individual", adults: 1, children: 0, peopleFed: 1 },
    favoriteFoods: [],
    dislikedFoods: [],
    preferredCuisines: [],
    refusedFoods: [],
    dietary: [],
    allergies: [],
    goal: "general",
    activity: "moderate",
    cookingFreq: "daily",
    maxCookMinutes: 45,
    mealsPerDay: ["breakfast", "lunch", "dinner"],
    budget: { includesSnacks: true, currency: "NGN" },
    onboarded: false,
  };
}

export function parseRequest(raw: string, prefs: Preferences | null): PlanRequest {
  const text = raw.toLowerCase();

  let days = 7;
  const dayMatch = text.match(/(\d+)\s*(?:day|days)/);
  if (/one day|1 day|just today|today only|tomorrow/.test(text)) days = 1;
  else if (/three days|3 days|3-day/.test(text)) days = 3;
  else if (/two weeks|14 days|fortnight/.test(text)) days = 14;
  else if (/thirty days|30 days|a month|one month/.test(text)) days = 30;
  else if (dayMatch) days = Math.min(30, Math.max(1, parseInt(dayMatch[1], 10)));
  else if (/week/.test(text)) days = 7;

  let people = prefs?.household.peopleFed ?? 1;
  const familyMatch = text.match(/family of (\d+)|for (\d+) people|for (\d+) persons|feeds? (\d+)/);
  if (familyMatch) people = parseInt(familyMatch[1] ?? familyMatch[2] ?? familyMatch[3] ?? familyMatch[4], 10);
  people = Math.min(12, Math.max(1, people));

  let budgetAmount: number | null = null;
  let budgetPeriod: PlanRequest["budgetPeriod"] = null;
  const money = text.match(/(?:₦|naira|ngn|\$|usd|£|€|ksh|ghs)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:naira|ngn|dollars?|pounds?|euros?)/);
  if (money) {
    const n = parseFloat((money[1] ?? money[2]).replace(/,/g, ""));
    if (!Number.isNaN(n) && n > 0) budgetAmount = n;
  }
  if (budgetAmount !== null) {
    if (/per day|daily|a day/.test(text)) budgetPeriod = "daily";
    else if (/per month|monthly|a month/.test(text)) budgetPeriod = "monthly";
    else budgetPeriod = "weekly";
  }

  let currency: Currency = prefs?.currency ?? "NGN";
  if (/\$|usd|dollars?/.test(text)) currency = "USD";
  else if (/₦|naira|ngn/.test(text)) currency = "NGN";
  else if (/ksh|kenyan/.test(text)) currency = "KES";
  else if (/cedis|ghs/.test(text)) currency = "GHS";
  else if (/£|pounds?|gbp/.test(text)) currency = "GBP";
  else if (/€|euros?/.test(text)) currency = "EUR";

  let goal = prefs?.goal ?? "general";
  if (/build muscle|muscle gain|bulking|gain weight/.test(text)) goal = "muscle_gain";
  else if (/lose weight|weight loss|slimming|cutting/.test(text)) goal = "weight_loss";
  else if (/high protein|more protein|protein/.test(text)) goal = "high_protein";
  else if (/maintain/.test(text)) goal = "maintain";

  const restrictions = [...(prefs?.dietary ?? []).filter((d) => d !== "none")];
  const add = (tag: string) => { if (!restrictions.includes(tag)) restrictions.push(tag); };
  if (/vegetarian/.test(text)) add("vegetarian");
  if (/vegan/.test(text)) add("vegan");
  if (/pescatarian/.test(text)) add("pescatarian");
  if (/dairy[- ]?free|no dairy/.test(text)) add("dairy_free");
  if (/gluten[- ]?free|no gluten/.test(text)) add("gluten_free");

  const allergies = [...(prefs?.allergies ?? [])];
  const allergyPairs: [RegExp, string][] = [
    [/(?:allergic to|allergy to|no)\s*nuts|nut allergy/, "nuts"],
    [/egg allergy|allergic to eggs/, "eggs"],
    [/fish allergy|allergic to fish/, "fish"],
    [/shellfish allergy|allergic to (shrimp|prawns|shellfish)/, "shellfish"],
    [/dairy allergy|allergic to dairy/, "dairy"],
    [/gluten allergy|allergic to gluten/, "gluten"],
  ];
  for (const [re, tag] of allergyPairs) if (re.test(text) && !allergies.includes(tag)) allergies.push(tag);

  const refusedFoods = [...(prefs?.refusedFoods ?? []), ...(prefs?.dislikedFoods ?? [])];
  const avoid = text.match(/(?:avoid|don'?t (?:eat|like|want)|no)\s+([a-z ]{3,40}?)(?:\.|,|$| and )/);
  if (avoid) {
    const food = avoid[1].trim();
    if (!/(expensive|cost|price|dairy|gluten|meat|snacks)/.test(food)) refusedFoods.push(food);
  }

  const cuisines: string[] = [];
  if (/nigerian|local food|local meals/.test(text)) cuisines.push("nigerian");
  if (/international|western|variety/.test(text)) cuisines.push("international");

  let maxMinutes: number | null = null;
  const time = text.match(/(?:less than|under|max(?:imum)?|within)\s*(\d+)\s*min/);
  if (time) maxMinutes = parseInt(time[1], 10);

  let meals: MealSlot[] = prefs?.mealsPerDay ?? ["breakfast", "lunch", "dinner"];
  if (/breakfast,? lunch (?:and|&) dinner/.test(text)) meals = ["breakfast", "lunch", "dinner"];
  else if (/only lunch and dinner|lunch and dinner/.test(text)) meals = ["lunch", "dinner"];
  else if (/dinner only/.test(text)) meals = ["dinner"];
  if (/include snacks|with snacks/.test(text) && !meals.includes("afternoon_snack")) meals = [...meals, "afternoon_snack"];

  return { raw, days, meals, people, budgetAmount, budgetPeriod, currency, goal, restrictions, allergies, refusedFoods, cuisines, maxMinutes };
}

export function budgetFor(req: PlanRequest): number {
  if (!req.budgetAmount) return 0;
  if (req.budgetPeriod === "daily") return round2(req.budgetAmount * req.days);
  if (req.budgetPeriod === "monthly") return round2((req.budgetAmount / 30) * req.days);
  return round2(req.budgetAmount);
}

export function eligibleRecipes(req: PlanRequest, library: Recipe[] = RECIPE_LIBRARY): Recipe[] {
  const vegan = req.restrictions.includes("vegan");
  const vegetarian = req.restrictions.includes("vegetarian");
  const pescatarian = req.restrictions.includes("pescatarian");
  const dairyFree = req.restrictions.includes("dairy_free");
  const glutenFree = req.restrictions.includes("gluten_free");
  const meat = ["chicken", "beef", "turkey"];

  return library.filter((r) => {
    if (vegan && !r.dietary.includes("vegan")) return false;
    if (vegetarian && !(r.dietary.includes("vegetarian") || r.dietary.includes("vegan"))) return false;
    if (pescatarian && r.ingredients.some((i) => meat.includes(i.item))) return false;
    if (dairyFree && r.allergens.includes("dairy")) return false;
    if (glutenFree && r.allergens.includes("gluten")) return false;
    for (const a of req.allergies) {
      if (r.allergens.includes(a)) return false;
      if (a === "nuts" && r.ingredients.some((i) => i.item.includes("groundnut") || i.item === "peanut_butter")) return false;
      if (a === "eggs" && r.ingredients.some((i) => i.item === "eggs")) return false;
      if (a === "fish" && r.ingredients.some((i) => ["mackerel", "catfish", "sardines", "tuna"].includes(i.item))) return false;
    }
    for (const refused of req.refusedFoods) {
      if (!refused) continue;
      if (r.name.toLowerCase().includes(refused) || r.ingredients.some((i) => i.item.replace(/_/g, " ").includes(refused))) return false;
    }
    if (req.maxMinutes !== null && r.prepMinutes + r.cookMinutes > req.maxMinutes) return false;
    if (req.cuisines.length > 0 && !req.cuisines.some((c) => r.cuisines.includes(c))) return false;
    return true;
  });
}

function score(r: Recipe, req: PlanRequest, costPerServing: number, budgetPerMeal: number): number {
  let s = 0;
  if (req.goal === "muscle_gain" || req.goal === "high_protein") s += Math.min(4, r.perServing.protein / 8);
  else if (req.goal === "weight_loss") s += Math.max(0, 3 - r.perServing.calories / 300);
  if (budgetPerMeal > 0) s += Math.max(0, 2 - (costPerServing / budgetPerMeal) * 2);
  if (req.days >= 7 && r.dietary.includes("family")) s += 0.5;
  if (req.maxMinutes !== null) s += 0.5;
  return s;
}

export type GeneratedPlan = {
  days: MealPlanDay[];
  estimatedTotal: number;
  budgetAmount: number;
  budgetRemaining: number;
  warnings: string[];
  swaps: number;
};

export function composePlan(
  req: PlanRequest,
  overrides?: PriceOverrides
): GeneratedPlan {
  const candidates = eligibleRecipes(req);
  if (candidates.length === 0) throw new Error("No recipes match your restrictions or preferences.");

  const budget = budgetFor(req);
  const budgetPerMeal = budget > 0 ? budget / (req.days * Math.max(1, req.meals.length)) : 0;

  const scored = candidates.map((recipe) => {
    const total = costOfRecipe(recipe, req.currency, overrides);
    const perServing = total / recipe.servingsBase;
    return { recipe, cost: total, perServing, score: score(recipe, req, perServing, budgetPerMeal) };
  });

  const lastUsed = new Map<string, number>();
  const days: MealPlanDay[] = [];
  const start = todayISO();
  let estimatedTotal = 0;

  for (let d = 0; d < req.days; d++) {
    const meals: ScheduledMeal[] = [];
    for (const slot of req.meals) {
      let pool = scored.filter((s) => s.recipe.mealTypes.includes(slot));
      if (pool.length === 0) pool = scored;
      pool.sort((a, b) => {
        const la = lastUsed.get(a.recipe.id) ?? -99;
        const lb = lastUsed.get(b.recipe.id) ?? -99;
        if (la !== lb) return la - lb;
        return b.score - a.score;
      });
      const pick = pool[0];
      const mealCost = round2(pick.perServing * req.people);
      estimatedTotal += mealCost;
      lastUsed.set(pick.recipe.id, d);
      meals.push({
        slot,
        recipeId: pick.recipe.id,
        recipeName: pick.recipe.name,
        servings: req.people,
        perServingNutrition: pick.recipe.perServing,
        estimatedCost: mealCost,
        prepared: false,
      });
    }
    days.push({ date: addDaysISO(start, d), meals });
  }

  // Budget optimization: bounded deterministic swaps of the costliest meals.
  let swaps = 0;
  if (budget > 0) {
    for (let pass = 0; pass < 50 && estimatedTotal > budget; pass++) {
      let target: ScheduledMeal | null = null;
      let targetCost = 0;
      for (const day of days) for (const m of day.meals) if (m.estimatedCost > targetCost) { target = m; targetCost = m.estimatedCost; }
      if (!target) break;
      const cheaper = scored
        .filter((s) => s.recipe.mealTypes.includes(target!.slot) && s.recipe.id !== target!.recipeId)
        .map((s) => ({ s, c: round2(s.perServing * req.people) }))
        .filter((x) => x.c < target!.estimatedCost * 0.92)
        .sort((a, b) => a.c - b.c)[0];
      if (!cheaper) break;
      estimatedTotal = round2(estimatedTotal - target.estimatedCost + cheaper.c);
      target.recipeId = cheaper.s.recipe.id;
      target.recipeName = cheaper.s.recipe.name;
      target.perServingNutrition = cheaper.s.recipe.perServing;
      target.estimatedCost = cheaper.c;
      swaps++;
    }
  }

  const warnings: string[] = [];
  if (budget > 0 && estimatedTotal > budget) {
    warnings.push(
      `This plan is estimated at ${estimatedTotal} ${req.currency}, which is over your ${budget} ${req.currency} budget. Try fewer meals per day or a higher budget.`
    );
  }

  return {
    days,
    estimatedTotal: round2(estimatedTotal),
    budgetAmount: budget,
    budgetRemaining: budget > 0 ? round2(budget - estimatedTotal) : 0,
    warnings,
    swaps,
  };
}

export function validatePlan(plan: MealPlan, req: PlanRequest): string[] {
  const issues: string[] = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const recipe = RECIPE_BY_ID.get(meal.recipeId);
      if (!recipe) { issues.push(`Missing recipe ${meal.recipeId}`); continue; }
      for (const a of req.allergies) if (recipe.allergens.includes(a)) issues.push(`Allergen (${a}) in ${recipe.name}`);
      if (req.restrictions.includes("vegan") && !recipe.dietary.includes("vegan")) issues.push(`Not vegan: ${recipe.name}`);
      if (req.restrictions.includes("vegetarian") && !(recipe.dietary.includes("vegetarian") || recipe.dietary.includes("vegan"))) issues.push(`Not vegetarian: ${recipe.name}`);
    }
  }
  return issues;
}
