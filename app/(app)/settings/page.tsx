import { redirect } from "next/navigation";
import { currentUser, getPreferences, getUsage } from "@/lib/store";
import { Card, Badge } from "@/components/ui";
import { PLANS } from "@/lib/plans";
import { saveSettingsAction, signOutAction } from "../../actions";
import { label } from "@/lib/utils";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "CAD", "AUD", "GHS", "KES", "ZAR"];

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  if (!prefs) redirect("/onboarding");
  const usage = await getUsage(user.id);
  const limits = PLANS[user.plan].limits;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-forest-950">Settings</h1>
        <p className="muted mt-1">Profile, goals, budget and privacy controls.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <p className="text-sm font-semibold text-forest-950">Profile & planning defaults</p>
            <form action={saveSettingsAction} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="displayName">Display name</label>
                <input id="displayName" name="displayName" className="input" defaultValue={prefs.displayName} />
              </div>
              <div>
                <label className="label" htmlFor="currency">Currency</label>
                <select id="currency" name="currency" className="input" defaultValue={prefs.currency}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="weeklyBudget">Weekly food budget</label>
                <input id="weeklyBudget" name="weeklyBudget" type="number" min={0} step="0.01" className="input" defaultValue={prefs.budget.weekly ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="maxCookMinutes">Max cooking time (min)</label>
                <input id="maxCookMinutes" name="maxCookMinutes" type="number" min={10} max={180} step={5} className="input" defaultValue={prefs.maxCookMinutes} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="goal">Nutrition goal</label>
                <select id="goal" name="goal" className="input" defaultValue={prefs.goal}>
                  {["general", "maintain", "weight_loss", "muscle_gain", "high_protein", "balanced"].map((g) => (
                    <option key={g} value={g}>{label(g)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <p className="label">Meals per day</p>
                <div className="flex flex-wrap gap-4">
                  {["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"].map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-forest-700">
                      <input type="checkbox" name="mealsPerDay" value={m} defaultChecked={prefs.mealsPerDay.includes(m as never)} className="h-4 w-4 rounded border-forest-300 text-forest-600" />
                      {label(m)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <button className="btn-primary">Save settings</button>
              </div>
            </form>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-forest-950">Dietary profile</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(prefs.dietary.length ? prefs.dietary : ["no restrictions"]).map((d) => <Badge key={d} tone="lime">{label(d)}</Badge>)}
              {prefs.allergies.map((a) => <Badge key={a} tone="amber">{a} allergy</Badge>)}
            </div>
            <p className="mt-3 text-xs text-forest-600">
              Update dietary needs and allergies in onboarding: <a className="font-semibold text-forest-800 underline" href="/onboarding">edit food profile</a>.
            </p>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-forest-950">Your data</p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-forest-600">
              <li>• Export everything you’ve stored as JSON: <a className="font-semibold text-forest-800 underline" href="/api/export">download my data</a>.</li>
              <li>• Dietary and allergy data is sensitive; it is only used to filter your plans and is not shared.</li>
              <li>• Account deletion requires email confirmation (not enabled without email delivery configured).</li>
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-forest-950">Subscription</p>
            <p className="mt-1 text-xs text-forest-500">Current: {PLANS[user.plan].name}</p>
            <div className="mt-3 space-y-2">
              {Object.values(PLANS).map((p) => (
                <div key={p.id} className={`rounded-xl border px-3 py-2.5 ${p.id === user.plan ? "border-forest-600 bg-forest-50" : "border-forest-100"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-forest-900">{p.name}</p>
                    <p className="text-xs text-forest-600">${p.priceUSD.toFixed(2)}/mo</p>
                  </div>
                  <p className="text-[11px] text-forest-500">{p.limits.plansPerMonth} plans · {p.limits.assistantMessages} messages</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-forest-400">
              Payment providers aren’t configured in this environment, so checkout is disabled. No payment is taken and no plan is upgraded silently.
            </p>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-forest-950">Usage this month</p>
            <div className="mt-2 space-y-1.5 text-xs text-forest-600">
              <p>Plans: {usage.plansGenerated} / {limits.plansPerMonth}</p>
              <p>Assistant messages: {usage.assistantMessages} / {limits.assistantMessages}</p>
            </div>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-forest-950">Account</p>
            <p className="mt-1 text-xs text-forest-500">{user.email}</p>
            <form action={signOutAction} className="mt-3">
              <button className="btn-secondary w-full">Log out</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
