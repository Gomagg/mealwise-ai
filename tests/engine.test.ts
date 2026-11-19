import { describe, expect, it } from "vitest";
import {
  budgetFor,
  buildGroceryList,
  composePlan,
  costOfRecipe,
  dayNutrition,
  groceryCsv,
  lineCost,
  parseRequest,
  planNutrition,
  toBase,
  validatePlan,
} from "../lib/engine";
import { INGREDIENTS, RECIPE_BY_ID, RECIPE_LIBRARY } from "../lib/food-data";
import { defaultPreferences } from "../lib/engine";
import type { GroceryList, MealPlan, PantryItem } from "../lib/types";

const prefs = defaultPreferences("usr_test");

describe("unit conversion and costs", () => {
  it("converts kg to grams", () => {
    expect(toBase("rice", 1, "kg")).toEqual({ qty: 1000, base: "g" });
  });

  it("converts pieces using per-piece weight", () => {
    const egg = toBase("eggs", 2, "piece");
    expect(egg).toEqual({ qty: 2, base: "piece" });
    const onion = toBase("onions", 2, "piece");
    expect(onion?.qty).toBe(2 * (INGREDIENTS.onions.pieceG ?? 0));
  });

  it("returns null for unsupported conversions", () => {
    expect(toBase("apple", 1, "litre")).toBeNull();
  });

  it("prices a line in NGN from the fixture table", () => {
    // 1 kg rice at ₦1.80 / g
    expect(lineCost({ item: "rice", qty: 1, unit: "kg" }, "NGN")).toBe(1800);
  });

  it("applies currency conversion factors", () => {
    const ngn = lineCost({ item: "rice", qty: 1, unit: "kg" }, "NGN")!;
    const usd = lineCost({ item: "rice", qty: 1, unit: "kg" }, "USD")!;
    expect(usd).toBeLessThan(ngn);
    expect(usd).toBeCloseTo(1800 / 1500, 2);
  });

  it("prefers user price overrides", () => {
    const normal = costOfRecipe(RECIPE_LIBRARY[0], "NGN");
    const overridden = costOfRecipe(RECIPE_LIBRARY[0], "NGN", { rice: 0.5 });
    expect(overridden).toBeLessThan(normal);
  });

  it("produces a positive cost for every recipe in the library", () => {
    for (const recipe of RECIPE_LIBRARY) {
      expect(costOfRecipe(recipe, "NGN"), recipe.name).toBeGreaterThan(0);
    }
  });
});

describe("nutrition totals", () => {
  it("scales per-serving nutrition by servings", () => {
    const n = { calories: 100, protein: 5, carbs: 10, fat: 2, fiber: 3 };
    const scaled = dayNutrition({
      date: "2026-01-01",
      meals: [
        { slot: "breakfast", recipeId: "x", recipeName: "x", servings: 2, perServingNutrition: n, estimatedCost: 10, prepared: false },
        { slot: "lunch", recipeId: "y", recipeName: "y", servings: 1, perServingNutrition: n, estimatedCost: 10, prepared: false },
      ],
    });
    expect(scaled.calories).toBe(300);
    expect(scaled.protein).toBe(15);
    expect(scaled.fiber).toBe(9);
  });
});

describe("request parsing", () => {
  it("reads budget, days, people and goal", () => {
    const req = parseRequest(
      "I have ₦35,000 for food this week for 4 people. High protein meals under 30 minutes.",
      prefs
    );
    expect(req.budgetAmount).toBe(35000);
    expect(req.budgetPeriod).toBe("weekly");
    expect(req.days).toBe(7);
    expect(req.people).toBe(4);
    expect(req.goal).toBe("high_protein");
    expect(req.maxMinutes).toBe(30);
  });

  it("detects vegan and nut allergy constraints", () => {
    const req = parseRequest("Vegan meals please, I have a nut allergy. 3 days.", prefs);
    expect(req.days).toBe(3);
    expect(req.restrictions).toContain("vegan");
    expect(req.allergies).toContain("nuts");
  });

  it("detects an explicit daily budget", () => {
    const req = parseRequest("I have ₦5,000 per day for a week.", prefs);
    expect(req.budgetPeriod).toBe("daily");
    expect(budgetFor(req)).toBe(35000);
  });

  it("scales a monthly budget to the plan length", () => {
    const req = parseRequest("₦90,000 per month, plan 30 days.", prefs);
    expect(budgetFor(req)).toBe(90000);
  });
});

describe("plan composition", () => {
  it("creates the requested number of days and meals", () => {
    const req = parseRequest("Plan 3 days of breakfast, lunch and dinner for 2 people.", prefs);
    const result = composePlan(req);
    expect(result.days).toHaveLength(3);
    for (const day of result.days) expect(day.meals).toHaveLength(3);
    for (const day of result.days) for (const meal of day.meals) expect(meal.servings).toBe(2);
  });

  it("keeps vegan and allergy constraints as hard rules", () => {
    const req = parseRequest("Vegan meals for 7 days. I'm allergic to nuts.", prefs);
    const result = composePlan(req);
    for (const day of result.days) {
      for (const meal of day.meals) {
        const recipe = RECIPE_BY_ID.get(meal.recipeId)!;
        expect(recipe.dietary).toContain("vegan");
        expect(recipe.allergens).not.toContain("nuts");
        expect(recipe.ingredients.some((i) => i.item === "groundnut" || i.item === "peanut_butter")).toBe(false);
      }
    }
  });

  it("tries to fit a tight budget and reports when it cannot", () => {
    const req = parseRequest("₦1,000 for a 7-day plan for 2 people, breakfast lunch and dinner.", prefs);
    const result = composePlan(req);
    expect(result.budgetAmount).toBe(1000);
    if (result.estimatedTotal > result.budgetAmount) {
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  it("never returns meals that violate a validated request", () => {
    const req = parseRequest("Vegetarian, no fish, 3 days.", prefs);
    const result = composePlan(req);
    const plan: MealPlan = {
      id: "mp_test", userId: "usr_test", title: "test", createdAt: new Date().toISOString(),
      days: result.days, people: req.people, budgetAmount: result.budgetAmount,
      currency: req.currency, estimatedTotal: result.estimatedTotal,
      budgetRemaining: result.budgetRemaining, goal: req.goal,
      restrictions: req.restrictions, notes: "", status: "active",
    };
    expect(validatePlan(plan, req)).toEqual([]);
  });
});

describe("grocery consolidation", () => {
  const meal = (recipeId: string, servings: number) => ({
    slot: "lunch" as const, recipeId, recipeName: RECIPE_BY_ID.get(recipeId)!.name,
    servings, perServingNutrition: RECIPE_BY_ID.get(recipeId)!.perServing,
    estimatedCost: 100, prepared: false,
  });

  const plan: MealPlan = {
    id: "mp_grocery",
    userId: "usr_test",
    title: "Grocery test",
    createdAt: new Date().toISOString(),
    days: [
      { date: "2026-01-01", meals: [meal("jollof-chicken", 1), meal("beans-porridge", 1)] },
      { date: "2026-01-02", meals: [meal("jollof-chicken", 2)] },
    ],
    people: 1,
    budgetAmount: 0,
    currency: "NGN",
    estimatedTotal: 0,
    budgetRemaining: 0,
    goal: "general",
    restrictions: [],
    notes: "",
    status: "active",
  };

  it("merges repeated ingredients into one line", () => {
    const list = buildGroceryList(plan, []);
    const names = list.items.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("Rice");
  });

  it("removes pantry items from the list", () => {
    const pantry: PantryItem[] = [
      { id: "p1", userId: "usr_test", name: "rice", qty: 2, unit: "kg" },
    ];
    const list = buildGroceryList(plan, pantry);
    expect(list.items.some((i) => i.name === "Rice")).toBe(false);
    expect(list.items.length).toBeGreaterThan(0);
  });

  it("computes a total equal to the sum of item estimates", () => {
    const list = buildGroceryList(plan, []);
    const sum = Math.round(list.items.reduce((s, i) => s + i.estimatedCost, 0) * 100) / 100;
    expect(list.estimatedTotal).toBeCloseTo(sum, 2);
  });

  it("exports CSV with a total row and escaped fields", () => {
    const list: GroceryList = {
      ...buildGroceryList(plan, []),
      items: [{ id: "x", name: 'Rice, "long grain"', category: "Grains", qty: 1, unit: "kg", estimatedCost: 100, purchased: false, fromPantry: false }],
      estimatedTotal: 100,
    };
    const csv = groceryCsv(list);
    expect(csv).toContain('"Rice, ""long grain"""');
    expect(csv).toContain("TOTAL");
    expect(csv).toContain("100");
  });
});
