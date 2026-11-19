import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getPreferences, listPlans } from "@/lib/store";
import { dayNutrition, planNutrition, NUTRITION_SOURCE } from "@/lib/engine";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const plans = await listPlans(auth.user.id);
  const plan = plans[0];
  if (!plan) {
    return NextResponse.json({ error: "No meal plan yet. Generate a plan first." }, { status: 404 });
  }
  const prefs = await getPreferences(auth.user.id);
  const date = new URL(req.url).searchParams.get("date") ?? todayISO();
  const day = plan.days.find((d) => d.date === date) ?? plan.days[0];
  const totals = planNutrition(plan);

  return NextResponse.json({
    date: day.date,
    planId: plan.id,
    planTitle: plan.title,
    goal: prefs?.goal ?? plan.goal,
    day: {
      nutrition: dayNutrition(day),
      meals: day.meals.map((m) => ({
        slot: m.slot,
        recipeId: m.recipeId,
        recipeName: m.recipeName,
        servings: m.servings,
        prepared: m.prepared,
        nutrition: m.perServingNutrition,
        estimatedCost: m.estimatedCost,
      })),
    },
    averagePerDay: {
      calories: Math.round(totals.calories / plan.days.length),
      protein: Math.round(totals.protein / plan.days.length),
      carbs: Math.round(totals.carbs / plan.days.length),
      fat: Math.round(totals.fat / plan.days.length),
      fiber: Math.round(totals.fiber / plan.days.length),
    },
    source: NUTRITION_SOURCE,
    disclaimer: "Nutrition values are planning estimates, not lab measurements or medical advice.",
  });
}
