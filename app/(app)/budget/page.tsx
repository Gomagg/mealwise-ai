import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, getPreferences, listPlans } from "@/lib/store";
import { money } from "@/lib/utils";
import { Card, Stat } from "@/components/ui";
import { BudgetBars } from "@/components/charts";

export default async function BudgetPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  const plans = await listPlans(user.id);
  const currency = prefs?.currency ?? "NGN";

  const planned = plans.map((p, i) => ({
    name: `Plan ${plans.length - i}`,
    planned: Math.round(p.estimatedTotal),
    budget: Math.round(p.budgetAmount),
  })).reverse();

  const avgPlan = plans.length ? plans.reduce((s, p) => s + p.estimatedTotal, 0) / plans.length : 0;
  const avgPerMeal = plans.length ? avgPlan / Math.max(1, plans[0].days.reduce((s, d) => s + d.meals.length, 0)) : 0;
  const people = prefs?.household.peopleFed ?? 1;
  const weekly = prefs?.budget.weekly ?? 0;
  const adherence = plans.filter((p) => p.budgetAmount > 0 && p.estimatedTotal <= p.budgetAmount).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-forest-950">Budget Insights</h1>
        <p className="muted mt-1">Planned costs from your saved plans. Actual spending is not tracked yet — these are estimates.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Weekly budget" value={weekly ? money(weekly, currency) : "Not set"} hint={`${money(weekly / Math.max(7, 1), currency)} / day`} />
        <Stat label="Avg plan estimate" value={money(avgPlan, currency)} hint={`${plans.length} saved plans`} />
        <Stat label="Avg cost / meal" value={money(avgPerMeal, currency)} hint="Across your latest plan" />
        <Stat label="Cost / person / week" value={money((weekly || avgPlan) / Math.max(1, people), currency)} hint={`${people} ${people === 1 ? "person" : "people"}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-sm font-semibold text-forest-950">Planned vs budget</p>
          {planned.length > 0 ? <BudgetBars data={planned} /> : <p className="mt-3 text-sm text-forest-600">Generate a plan to see budget comparison.</p>}
          <p className="mt-1 text-[11px] text-forest-400">All figures are planning estimates, not actual store receipts.</p>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-forest-950">Budget adherence</p>
            <p className="mt-2 text-3xl font-bold text-forest-950">{plans.length ? `${adherence}/${plans.length}` : "—"}</p>
            <p className="text-xs text-forest-600">plans within budget</p>
            <div className="mt-4 space-y-2 text-xs text-forest-600">
              <p>• Per-person weekly: {money((weekly || avgPlan) / Math.max(1, people), currency)}</p>
              <p>• Per-day estimate: {money(avgPlan / Math.max(1, plans[0]?.days.length ?? 7), currency)}</p>
              <p>• Cheapest plan: {plans.length ? money(Math.min(...plans.map((p) => p.estimatedTotal)), currency) : "—"}</p>
            </div>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-forest-950">Reduce spending</p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-forest-600">
              <li>1. Use “Cheaper swap” on any meal — the plan updates its total and grocery list.</li>
              <li>2. Keep staples (rice, beans, yam) in the pantry so lists skip them.</li>
              <li>3. Plan 7 days instead of 30 to keep ingredient variety low.</li>
            </ul>
            <Link href="/planner" className="btn-secondary mt-3 w-full">Plan with a budget</Link>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-forest-950">Currency & local units</p>
            <p className="mt-1 text-xs leading-relaxed text-forest-600">
              Currently {currency}. Local units like derica, paint bucket and mudu are supported in the price engine as documented approximations —
              they’re not universal conversions.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
