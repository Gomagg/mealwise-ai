import type { Plan } from "./types";

// Subscription plan definitions. Prices are initial hypotheses to validate,
// not confirmed market prices (spec §17).
export const PLANS: Record<Plan, {
  id: Plan;
  name: string;
  priceUSD: number;
  tagline: string;
  features: string[];
  limits: { plansPerMonth: number; assistantMessages: number; maxPeople: number };
}> = {
  free: {
    id: "free",
    name: "Free",
    priceUSD: 0,
    tagline: "Try the core planner",
    features: ["3 AI meal plans / month", "Basic grocery lists", "20 assistant messages / month", "Basic recipe discovery"],
    limits: { plansPerMonth: 3, assistantMessages: 20, maxPeople: 2 },
  },
  smart: {
    id: "smart",
    name: "Smart",
    priceUSD: 4.99,
    tagline: "For everyday healthy eating",
    features: ["30 AI meal plans / month", "Budget-aware planning", "Full grocery lists + CSV", "Recipe saving", "Nutrition tracking", "Pantry management", "100 assistant messages / month"],
    limits: { plansPerMonth: 30, assistantMessages: 100, maxPeople: 6 },
  },
  family_pro: {
    id: "family_pro",
    name: "Family Pro",
    priceUSD: 9.99,
    tagline: "For households",
    features: ["120 AI meal plans / month", "Plans up to 30 days", "Household profiles", "Shared grocery lists", "Meal prep scheduling", "Advanced nutrition insights", "1,000 assistant messages / month"],
    limits: { plansPerMonth: 120, assistantMessages: 1000, maxPeople: 12 },
  },
};

export function canGeneratePlan(plan: Plan, usage: { plansGenerated: number }, people: number): string | null {
  const { limits } = PLANS[plan];
  if (usage.plansGenerated >= limits.plansPerMonth) {
    return `You've used all ${limits.plansPerMonth} meal plans on the ${PLANS[plan].name} plan this month. Upgrade to keep planning.`;
  }
  if (people > limits.maxPeople) {
    return `The ${PLANS[plan].name} plan supports up to ${limits.maxPeople} people per plan.`;
  }
  return null;
}

export function canMessage(plan: Plan, usage: { assistantMessages: number }): string | null {
  const { limits } = PLANS[plan];
  if (usage.assistantMessages >= limits.assistantMessages) {
    return `You've reached your ${limits.assistantMessages} assistant messages for this month on the ${PLANS[plan].name} plan.`;
  }
  return null;
}
