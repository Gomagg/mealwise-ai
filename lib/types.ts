export type Currency = "NGN" | "USD" | "GBP" | "EUR" | "CAD" | "AUD" | "GHS" | "KES" | "ZAR";
export type Plan = "free" | "smart" | "family_pro";
export type MealSlot = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack";
export type NutritionSource = "fixture_estimate" | "usda_fdc" | "open_food_facts" | "user_entry";

export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
};

export type IngredientLine = { item: string; qty: number; unit: string; optional?: boolean };

export type Recipe = {
  id: string;
  name: string;
  mealTypes: MealSlot[];
  cuisines: string[];
  dietary: string[];
  allergens: string[];
  prepMinutes: number;
  cookMinutes: number;
  servingsBase: number;
  perServing: Nutrition;
  ingredients: IngredientLine[];
  instructions: string[];
  childFriendly: boolean;
  emoji: string;
};

export type ScheduledMeal = {
  slot: MealSlot;
  recipeId: string;
  recipeName: string;
  servings: number;
  perServingNutrition: Nutrition;
  estimatedCost: number;
  prepared: boolean;
};

export type MealPlanDay = { date: string; meals: ScheduledMeal[] };

export type MealPlan = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  days: MealPlanDay[];
  people: number;
  budgetAmount: number;
  currency: Currency;
  estimatedTotal: number;
  budgetRemaining: number;
  goal: string;
  restrictions: string[];
  notes: string;
  status: "active" | "archived";
};

export type GroceryItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  estimatedCost: number;
  purchased: boolean;
  fromPantry: boolean;
};

export type GroceryList = {
  id: string;
  userId: string;
  mealPlanId: string | null;
  title: string;
  createdAt: string;
  currency: Currency;
  items: GroceryItem[];
  estimatedTotal: number;
};

export type PantryItem = {
  id: string;
  userId: string;
  name: string;
  qty: number;
  unit: string;
  purchaseDate?: string;
  expirationDate?: string;
  location?: string;
  estimatedCost?: number;
};

export type Preferences = {
  userId: string;
  displayName: string;
  country: string;
  city: string;
  language: string;
  currency: Currency;
  timezone: string;
  household: { type: "individual" | "family"; adults: number; children: number; peopleFed: number };
  favoriteFoods: string[];
  dislikedFoods: string[];
  preferredCuisines: string[];
  refusedFoods: string[];
  dietary: string[];
  allergies: string[];
  goal: string;
  activity: string;
  cookingFreq: string;
  maxCookMinutes: number;
  mealsPerDay: MealSlot[];
  budget: { daily?: number; weekly?: number; monthly?: number; includesSnacks: boolean; currency: Currency };
  onboarded: boolean;
};

export type Profile = {
  id: string;
  email: string;
  passwordHash?: string;
  plan: Plan;
  createdAt: string;
  isAdmin: boolean;
};

export type Usage = { plansGenerated: number; assistantMessages: number; period: string };
export type AiMessage = { role: "user" | "assistant"; content: string; at: string };
export type Conversation = { id: string; userId: string; title: string; createdAt: string; messages: AiMessage[] };
