import { currentUser, getPreferences, getUsage } from "@/lib/store";
import { redirect } from "next/navigation";
import { PlannerForm } from "./planner-form";
import { PLANS } from "@/lib/plans";
import { money, label } from "@/lib/utils";

export default async function PlannerPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  if (!prefs) redirect("/onboarding");
  const usage = await getUsage(user.id);
  const limits = PLANS[user.plan].limits;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-forest-950">AI Meal Planner</h1>
        <p className="muted mt-1">Tell us your week in your own words. We turn it into meals, portions, estimates and a grocery list.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Budget", prefs.budget.weekly ? money(prefs.budget.weekly, prefs.currency) + "/week" : "Not set"],
          ["Household", `${prefs.household.peopleFed} ${prefs.household.peopleFed === 1 ? "person" : "people"}`],
          ["Goal", label(prefs.goal)],
          ["Plans left", `${Math.max(0, limits.plansPerMonth - usage.plansGenerated)} this month`],
        ].map(([l, v]) => (
          <div key={l} className="card px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-500">{l}</p>
            <p className="mt-0.5 text-sm font-semibold text-forest-950">{v}</p>
          </div>
        ))}
      </div>

      <PlannerForm defaultPrompt={`I have ${prefs.budget.weekly ? money(prefs.budget.weekly, prefs.currency) : "my budget"} for food this week. Plan 7 days of ${prefs.mealsPerDay.join(", ").replace(/_/g, " ")} for ${prefs.household.peopleFed} ${prefs.household.peopleFed === 1 ? "person" : "people"}${prefs.dietary.length ? `, ${prefs.dietary.join(", ").replace(/_/g, "-")}` : ""}${prefs.allergies.length ? `, avoid ${prefs.allergies.join(", ")}` : ""}.`} />

      <div className="rounded-2xl border border-forest-100 bg-white p-5">
        <p className="text-sm font-semibold text-forest-950">How the plan is built</p>
        <ol className="mt-2 grid gap-2 text-xs leading-relaxed text-forest-600 sm:grid-cols-2">
          <li>1. Your request is parsed for budget, days, people, goals and restrictions.</li>
          <li>2. Recipes are filtered by diet and allergies — hard constraints are never traded for price.</li>
          <li>3. Portions and costs are calculated server-side, then the plan is checked against your budget.</li>
          <li>4. Grocery items are consolidated, pantry items are removed, and everything is saved.</li>
        </ol>
      </div>
    </div>
  );
}
