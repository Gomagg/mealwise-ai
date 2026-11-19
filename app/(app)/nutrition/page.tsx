import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, getPreferences, listPlans } from "@/lib/store";
import { dayNutrition, planNutrition, NUTRITION_SOURCE } from "@/lib/engine";
import { label, prettyDate } from "@/lib/utils";
import { Card, Empty, Progress, Stat } from "@/components/ui";
import { MacroBars, CalorieLine, MealSplit } from "@/components/charts";

export default async function NutritionPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  const plans = await listPlans(user.id);
  const plan = plans[0];

  if (!plan) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-forest-950">Nutrition Tracker</h1>
          <p className="muted mt-1">Daily calories and macros for your planned meals.</p>
        </div>
        <Empty title="Nothing to track yet" body="Generate a meal plan and your nutrition estimates appear here automatically." cta="Create a plan" href="/planner" />
      </div>
    );
  }

  const totals = planNutrition(plan);
  const days = plan.days.length;
  const avgCal = totals.calories / days;
  const avgProtein = totals.protein / days;
  const avgFiber = totals.fiber / days;

  const weekBars = plan.days.map((d) => {
    const n = dayNutrition(d);
    return { name: prettyDate(d.date).split(" ").slice(0, 2).join(" "), protein: Math.round(n.protein), carbs: Math.round(n.carbs), fat: Math.round(n.fat) };
  });
  const calLine = plan.days.map((d) => ({ name: prettyDate(d.date).split(" ")[1], calories: Math.round(dayNutrition(d).calories) }));
  const mealSplit = ["breakfast", "lunch", "dinner", "morning_snack", "afternoon_snack", "evening_snack"]
    .map((slot) => {
      const value = plan.days.reduce((s, d) => s + d.meals.filter((m) => m.slot === slot).reduce((x, m) => x + m.perServingNutrition.calories * m.servings, 0), 0);
      return { name: label(slot), value: Math.round(value) };
    })
    .filter((x) => x.value > 0);

  const targets: Record<string, { kcal: number; protein: number; fiber: number }> = {
    weight_loss: { kcal: 1600, protein: 100, fiber: 30 },
    muscle_gain: { kcal: 2600, protein: 140, fiber: 30 },
    high_protein: { kcal: 2200, protein: 130, fiber: 30 },
    maintain: { kcal: 2100, protein: 90, fiber: 30 },
    balanced: { kcal: 2000, protein: 85, fiber: 30 },
    general: { kcal: 2000, protein: 85, fiber: 30 },
  };
  const t = targets[prefs?.goal ?? "general"] ?? targets.general;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-forest-950">Nutrition Tracker</h1>
          <p className="muted mt-1">Estimated daily totals for “{plan.title}”. Goal: {label(prefs?.goal ?? "general")}.</p>
        </div>
        <Link href={`/plans/${plan.id}`} className="btn-secondary">Open plan</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Avg calories / day" value={`${Math.round(avgCal)} kcal`} hint={`Target ~${t.kcal} kcal`} />
        <Stat label="Avg protein / day" value={`${Math.round(avgProtein)} g`} hint={`Target ~${t.protein} g`} />
        <Stat label="Avg fibre / day" value={`${Math.round(avgFiber)} g`} hint={`Target ~${t.fiber} g`} />
        <Stat label="Cost / 1,000 kcal" value={`${plan.estimatedTotal ? Math.round((plan.estimatedTotal / totals.calories) * 1000) : 0} ${plan.currency}`} hint="Estimate" />
      </div>

      <Card>
        <p className="text-sm font-semibold text-forest-950">Goal progress (daily average)</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            ["Calories", avgCal, t.kcal, "kcal"],
            ["Protein", avgProtein, t.protein, "g"],
            ["Fibre", avgFiber, t.fiber, "g"],
          ].map(([l, v, target, u]) => (
            <div key={String(l)}>
              <div className="flex justify-between text-xs text-forest-600">
                <span>{l}</span>
                <span>{Math.round(Number(v))}{u} / {target}{u}</span>
              </div>
              <div className="mt-1.5"><Progress value={(Number(v) / Number(target)) * 100} tone={Number(v) < Number(target) * 0.7 ? "amber" : "forest"} /></div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-forest-400">
          Targets are simple planning heuristics, not medical advice. Nutrition values are estimates (source: {NUTRITION_SOURCE}).
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-forest-950">Macros per day</p>
          <MacroBars data={weekBars} />
        </Card>
        <Card>
          <p className="text-sm font-semibold text-forest-950">Calories per day</p>
          <CalorieLine data={calLine} />
        </Card>
        <Card>
          <p className="text-sm font-semibold text-forest-950">Meal distribution</p>
          <MealSplit data={mealSplit} />
          <div className="flex flex-wrap gap-2">
            {mealSplit.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-forest-600">
                <span className="h-2 w-2 rounded-full" style={{ background: ["#2f6840", "#a3d977", "#63a06f", "#eaf6df", "#95bf9e", "#265334"][i % 6] }} />
                {s.name}
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-forest-950">Daily detail</p>
          <div className="mt-2 max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-forest-500">
                  <th className="py-1.5">Day</th><th>Kcal</th><th>P</th><th>C</th><th>F</th><th>Fibre</th>
                </tr>
              </thead>
              <tbody>
                {plan.days.map((d) => {
                  const n = dayNutrition(d);
                  return (
                    <tr key={d.date} className="border-t border-forest-50 text-forest-700">
                      <td className="py-1.5">{prettyDate(d.date)}</td>
                      <td>{Math.round(n.calories)}</td>
                      <td>{Math.round(n.protein)}</td>
                      <td>{Math.round(n.carbs)}</td>
                      <td>{Math.round(n.fat)}</td>
                      <td>{Math.round(n.fiber)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
