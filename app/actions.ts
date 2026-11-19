"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as db from "@/lib/store";
import { generateMealPlan, replaceMeal, chatWithAssistant } from "@/lib/assistant";
import { buildGroceryList } from "@/lib/engine";
import { canGeneratePlan, canMessage } from "@/lib/plans";
import type { Currency, MealSlot, PantryItem, Preferences } from "@/lib/types";
import { round2 } from "@/lib/utils";

// ------------------------------- auth --------------------------------------

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signUpAction(_prev: unknown, formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  try {
    const profile = await db.register(parsed.data.email, parsed.data.password);
    await db.createSession(profile.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create account" };
  }
  redirect("/onboarding");
}

export async function signInAction(_prev: unknown, formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password" };
  let profile;
  try {
    profile = await db.login(parsed.data.email, parsed.data.password);
    await db.createSession(profile.id);
  } catch {
    return { error: "Invalid email or password" };
  }
  const prefs = await db.getPreferences(profile.id);
  redirect(prefs?.onboarded ? "/dashboard" : "/onboarding");
}

export async function signOutAction() {
  await db.destroySession();
  redirect("/");
}

// ------------------------------- onboarding --------------------------------

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

const numberOr = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export async function saveOnboardingAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");

  const meals: MealSlot[] = [];
  if (formData.get("meal_breakfast")) meals.push("breakfast");
  if (formData.get("meal_morning_snack")) meals.push("morning_snack");
  if (formData.get("meal_lunch")) meals.push("lunch");
  if (formData.get("meal_afternoon_snack")) meals.push("afternoon_snack");
  if (formData.get("meal_dinner")) meals.push("dinner");
  if (formData.get("meal_evening_snack")) meals.push("evening_snack");

  const adults = Math.max(1, numberOr(formData.get("adults"), 1));
  const children = numberOr(formData.get("children"), 0);
  const currency = String(formData.get("currency") ?? "NGN") as Currency;

  const prefs: Preferences = {
    userId: user.id,
    displayName: String(formData.get("displayName") ?? "").trim() || user.email.split("@")[0],
    country: String(formData.get("country") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    language: String(formData.get("language") ?? "en"),
    currency,
    timezone: String(formData.get("timezone") ?? "Africa/Lagos"),
    household: {
      type: adults + children > 1 ? "family" : "individual",
      adults,
      children,
      peopleFed: Math.max(1, numberOr(formData.get("peopleFed"), adults + children)),
    },
    favoriteFoods: list(formData.get("favoriteFoods")),
    dislikedFoods: list(formData.get("dislikedFoods")),
    preferredCuisines: list(formData.get("cuisines")),
    refusedFoods: [],
    dietary: formData.getAll("dietary").map(String).filter((d) => d && d !== "none"),
    allergies: formData.getAll("allergies").map(String).filter(Boolean),
    goal: String(formData.get("goal") ?? "general"),
    activity: String(formData.get("activity") ?? "moderate"),
    cookingFreq: String(formData.get("cookingFreq") ?? "daily"),
    maxCookMinutes: Math.max(10, numberOr(formData.get("maxCookMinutes"), 45)),
    mealsPerDay: meals.length > 0 ? meals : ["breakfast", "lunch", "dinner"],
    budget: {
      weekly: numberOr(formData.get("weeklyBudget"), 0) || undefined,
      daily: numberOr(formData.get("dailyBudget"), 0) || undefined,
      monthly: numberOr(formData.get("monthlyBudget"), 0) || undefined,
      includesSnacks: formData.get("includesSnacks") === "on",
      currency,
    },
    onboarded: true,
  };
  await db.savePreferences(prefs);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveSettingsAction(formData: FormData) {  const user = await db.currentUser();
  if (!user) redirect("/login");
  const existing = await db.getPreferences(user.id);
  if (!existing) redirect("/onboarding");

  const meals = formData.getAll("mealsPerDay").map(String) as MealSlot[];
  const updated: Preferences = {
    ...existing,
    displayName: String(formData.get("displayName") ?? existing.displayName),
    currency: (String(formData.get("currency") ?? existing.currency) as Currency),
    maxCookMinutes: numberOr(formData.get("maxCookMinutes"), existing.maxCookMinutes),
    mealsPerDay: meals.length ? meals : existing.mealsPerDay,
    goal: String(formData.get("goal") ?? existing.goal),
    budget: {
      ...existing.budget,
      weekly: numberOr(formData.get("weeklyBudget"), existing.budget.weekly ?? 0) || undefined,
      currency: (String(formData.get("currency") ?? existing.currency) as Currency),
    },
  };
  await db.savePreferences(updated);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateHouseholdAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const existing = await db.getPreferences(user.id);
  if (!existing) redirect("/onboarding");
  const adults = Math.max(1, numberOr(formData.get("adults"), existing.household.adults));
  const children = numberOr(formData.get("children"), existing.household.children);
  await db.savePreferences({
    ...existing,
    household: {
      type: adults + children > 1 ? "family" : "individual",
      adults,
      children,
      peopleFed: Math.max(1, numberOr(formData.get("peopleFed"), adults + children)),
    },
  });
  revalidatePath("/household");
  revalidatePath("/dashboard");
}

// ------------------------------- planning ----------------------------------

export async function generatePlanAction(_prev: unknown, formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (prompt.length < 10) return { error: "Describe what you need — budget, days, people and any dietary needs." };

  const prefs = await db.getPreferences(user.id);
  const usage = await db.getUsage(user.id);
  const people = prefs?.household.peopleFed ?? 1;
  const blocked = canGeneratePlan(user.plan, usage, people);
  if (blocked) return { error: blocked };

  const result = await generateMealPlan(user, prefs, prompt);
  if (!result.ok) return { error: result.error };
  revalidatePath("/dashboard");
  revalidatePath("/plans");
  redirect(`/plans/${result.plan.id}`);
}

export async function replaceMealAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const planId = String(formData.get("planId"));
  const dayIndex = Number(formData.get("dayIndex"));
  const mealIndex = Number(formData.get("mealIndex"));
  const cheaper = formData.get("cheaper") === "1";

  const plan = await db.getPlan(user.id, planId);
  if (!plan) return;
  await replaceMeal(user, plan, dayIndex, mealIndex, cheaper);
  revalidatePath(`/plans/${planId}`);
}

export async function togglePreparedAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const planId = String(formData.get("planId"));
  const dayIndex = Number(formData.get("dayIndex"));
  const mealIndex = Number(formData.get("mealIndex"));
  const plan = await db.getPlan(user.id, planId);
  if (!plan) return;
  const meal = plan.days[dayIndex]?.meals[mealIndex];
  if (!meal) return;
  meal.prepared = !meal.prepared;
  await db.savePlan(plan);
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/dashboard");
  revalidatePath("/nutrition");
}

export async function deletePlanAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("planId"));
  await db.deletePlan(user.id, id);
  revalidatePath("/plans");
  redirect("/plans");
}

// ------------------------------- grocery -----------------------------------

export async function toggleGroceryItemAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const listId = String(formData.get("listId"));
  const itemId = String(formData.get("itemId"));
  const list = await db.getList(user.id, listId);
  if (!list) return;
  const item = list.items.find((i) => i.id === itemId);
  if (!item) return;
  item.purchased = !item.purchased;
  await db.saveList(list);
  revalidatePath("/grocery");
  revalidatePath(`/grocery/${listId}`);
}

export async function addGroceryItemAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const listId = String(formData.get("listId"));
  const name = String(formData.get("name") ?? "").trim();
  const qty = numberOr(formData.get("qty"), 1);
  const unit = String(formData.get("unit") ?? "piece");
  const cost = numberOr(formData.get("cost"), 0);
  if (!name) return;
  const list = await db.getList(user.id, listId);
  if (!list) return;
  list.items.push({
    id: `gi_${Math.random().toString(36).slice(2, 10)}`,
    name,
    category: "Other",
    qty,
    unit,
    estimatedCost: round2(cost),
    purchased: false,
    fromPantry: false,
  });
  list.estimatedTotal = round2(list.items.reduce((s, i) => s + i.estimatedCost, 0));
  await db.saveList(list);
  revalidatePath("/grocery");
  revalidatePath(`/grocery/${listId}`);
}

export async function recalcListAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const planId = String(formData.get("planId"));
  const plan = await db.getPlan(user.id, planId);
  if (!plan) return;
  const pantry = await db.listPantry(user.id);
  const fresh = buildGroceryList(plan, pantry);
  await db.saveList(fresh);
  revalidatePath("/grocery");
  redirect(`/grocery/${fresh.id}`);
}

// ------------------------------- pantry ------------------------------------

export async function addPantryItemAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const item: PantryItem = {
    id: `pi_${Math.random().toString(36).slice(2, 10)}`,
    userId: user.id,
    name: name.toLowerCase(),
    qty: numberOr(formData.get("qty"), 1),
    unit: String(formData.get("unit") ?? "piece"),
    purchaseDate: String(formData.get("purchaseDate") ?? "") || undefined,
    expirationDate: String(formData.get("expirationDate") ?? "") || undefined,
    location: String(formData.get("location") ?? "") || undefined,
    estimatedCost: numberOr(formData.get("estimatedCost"), 0) || undefined,
  };
  await db.savePantryItem(item);
  revalidatePath("/pantry");
}

export async function deletePantryItemAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  await db.deletePantryItem(user.id, String(formData.get("itemId")));
  revalidatePath("/pantry");
}

// ------------------------------- assistant ---------------------------------

export async function chatAction(_prev: unknown, formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Type a message." };
  const prefs = await db.getPreferences(user.id);
  const usage = await db.getUsage(user.id);
  const blocked = canMessage(user.plan, usage);
  if (blocked) return { error: blocked };

  const result = await chatWithAssistant(user, prefs, message, String(formData.get("conversationId") || "") || undefined);
  revalidatePath("/assistant");
  return { ok: true, conversationId: result.conversationId };
}

export async function newConversationAction() {
  revalidatePath("/assistant");
  redirect("/assistant");
}

export async function deleteConversationAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  await db.deleteConversation(user.id, String(formData.get("conversationId")));
  revalidatePath("/assistant");
  redirect("/assistant");
}

// ------------------------------- favorites ---------------------------------

export async function toggleFavoriteAction(formData: FormData) {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  await db.toggleFavorite(user.id, String(formData.get("recipeId")));
  revalidatePath("/recipes");
}

// ------------------------------- billing -----------------------------------

export async function upgradeAction(formData: FormData) {
  // Payment provider adapters are configured via env. With no credentials the
  // app never pretends a payment happened: it returns a clear notice.
  const plan = String(formData.get("plan"));
  void plan;
  return {
    error:
      "Billing isn't connected in this environment. Add Stripe, Paystack or Flutterwave keys (see .env.example) to enable checkout. No payment was taken.",
  };
}

// ------------------------------- data export -------------------------------

export async function exportDataAction() {
  const user = await db.currentUser();
  if (!user) redirect("/login");
  const prefs = await db.getPreferences(user.id);
  const plans = await db.listPlans(user.id);
  const lists = await db.listLists(user.id);
  const pantry = await db.listPantry(user.id);
  return {
    exportedAt: new Date().toISOString(),
    account: { email: user.email, createdAt: user.createdAt, plan: user.plan },
    preferences: prefs,
    mealPlans: plans,
    groceryLists: lists,
    pantry,
  };
}

export { };
