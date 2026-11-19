import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, getPreferences, listPlans, listLists } from "@/lib/store";
import { Card, Badge } from "@/components/ui";
import { updateHouseholdAction } from "../../actions";
import { money, label } from "@/lib/utils";

export default async function HouseholdPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  if (!prefs) redirect("/onboarding");
  const plans = await listPlans(user.id);
  const lists = await listLists(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-forest-950">Family & Household</h1>
        <p className="muted mt-1">Portions, budgets and shopping quantities scale to everyone you cook for.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-forest-950">{prefs.household.type === "family" ? "Family household" : "Individual household"}</p>
              <p className="text-xs text-forest-500">{prefs.household.adults} adult(s) · {prefs.household.children} child(ren) · meals for {prefs.household.peopleFed}</p>
            </div>
            <Badge tone="green">{prefs.household.peopleFed} fed</Badge>
          </div>

          <form action={updateHouseholdAction} className="mt-5 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="adults">Adults</label>
              <input id="adults" name="adults" type="number" min={1} max={12} defaultValue={prefs.household.adults} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="children">Children</label>
              <input id="children" name="children" type="number" min={0} max={12} defaultValue={prefs.household.children} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="peopleFed">People fed per meal</label>
              <input id="peopleFed" name="peopleFed" type="number" min={1} max={12} defaultValue={prefs.household.peopleFed} className="input" />
            </div>
            <div className="sm:col-span-3">
              <button className="btn-primary">Save household</button>
            </div>
          </form>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-forest-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">Combined dietary needs</p>
              <p className="mt-1 text-sm text-forest-800">
                {prefs.dietary.length ? prefs.dietary.map(label).join(", ") : "No restrictions"}
                {prefs.allergies.length ? ` · allergies: ${prefs.allergies.join(", ")}` : ""}
              </p>
              <p className="mt-1 text-[11px] text-forest-500">One household profile in this release — per-member profiles are on the roadmap.</p>
            </div>
            <div className="rounded-xl bg-forest-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">Shared budget</p>
              <p className="mt-1 text-sm text-forest-800">{prefs.budget.weekly ? `${money(prefs.budget.weekly, prefs.currency)} / week` : "Not set"}</p>
              <p className="mt-1 text-[11px] text-forest-500">{prefs.budget.includesSnacks ? "Includes snacks and drinks" : "Food only"}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-forest-950">Shared with the household</p>
            <ul className="mt-2 space-y-2 text-xs text-forest-600">
              <li>{plans.length} saved meal plan(s)</li>
              <li>{lists.length} grocery list(s)</li>
              <li>{prefs.mealsPerDay.map(label).join(", ")}</li>
            </ul>
            <Link href="/planner" className="btn-secondary mt-3 w-full">Plan for the household</Link>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-forest-950">Invitations</p>
            <p className="mt-1 text-xs leading-relaxed text-forest-600">
              Member invitations and per-person allergies need email delivery and the full household schema. They are scaffolded in the database migration but not enabled in this release.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
