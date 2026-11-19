import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, getPreferences, listPlans, listPantry, getUsage, listLists } from "@/lib/store";
import { dayNutrition, planNutrition } from "@/lib/engine";
import { money, prettyDate, label } from "@/lib/utils";
import { Card, Stat, Progress, Badge, Empty, SectionTitle } from "@/components/ui";
import { PLANS } from "@/lib/plans";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  if (!prefs) redirect("/onboarding");

  const plans = await listPlans(user.id);
  const pantry = await listPantry(user.id);
  const lists = await listLists(user.id);
  const usage = await getUsage(user.id);
  const latest = plans[0];
  const today = new Date().toISOString().slice(0, 10);
  const todayDay = latest?.days.find((d) => d.date === today) ?? latest?.days[0];
  const todayNutrition = todayDay ? dayNutrition(todayDay) : null;
  const weekTotal = latest ? planNutrition(latest) : null;
  const expiring = pantry.filter((p) => p.expirationDate && p.expirationDate <= new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
  const limits = PLANS[user.plan].limits;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-forest-950">Hello, {prefs.displayName || "there"} 👋</h1>
          <p className="muted mt-1">Here’s your food plan, budget and pantry at a glance.</p>
        </div>
        <Link href="/planner" className="btn-primary">Plan my week</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Weekly budget" value={prefs.budget.weekly ? money(prefs.budget.weekly, prefs.currency) : "Not set"} hint={`${prefs.household.peopleFed} ${prefs.household.peopleFed === 1 ? "person" : "people"} · ${prefs.currency}`} />
        <Stat label="Plans this month" value={`${usage.plansGenerated}/${limits.plansPerMonth}`} hint={`${PLANS[user.plan].name} plan`} />
        <Stat label="Latest plan cost" value={latest ? money(latest.estimatedTotal, latest.currency) : "—"} hint={latest ? `${latest.days.length} days` : "No plan yet"} />
        <Stat label="Pantry items" value={String(pantry.length)} hint={expiring.length ? `${expiring.length} expiring soon` : "Nothing expiring"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle title="Today’s meals" sub={latest ? `From “${latest.title}”` : "Generate a plan to fill your day"} action={latest ? <Link href={`/plans/${latest.id}`} className="btn-secondary">Open plan</Link> : null} />
          {latest && todayDay ? (
            <div className="space-y-3">
              {todayDay.meals.map((m) => (
                <div key={m.slot} className="card flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lime-soft text-xl">
                    {m.slot === "breakfast" ? "🌅" : m.slot.includes("snack") ? "🍎" : m.slot === "lunch" ? "☀️" : "🌙"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-forest-950">{m.recipeName}</p>
                      {m.prepared ? <Badge tone="green">Prepared</Badge> : null}
                    </div>
                    <p className="text-xs text-forest-500">
                      {label(m.slot)} · {m.servings} {m.servings === 1 ? "serving" : "servings"} · {m.perServingNutrition.calories} kcal/serving · {m.perServingNutrition.protein}g protein
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-forest-800">{money(m.estimatedCost, latest.currency)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No meals planned yet" body="Describe your week, budget and goals — the planner builds breakfast, lunch and dinner plus a grocery list." cta="Create my first plan" href="/planner" />
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-forest-950">Budget position</p>
            {latest && latest.budgetAmount > 0 ? (
              <>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-forest-950">{money(latest.estimatedTotal, latest.currency)}</span>
                  <span className="text-xs text-forest-500">of {money(latest.budgetAmount, latest.currency)}</span>
                </div>
                <div className="mt-2"><Progress value={(latest.estimatedTotal / latest.budgetAmount) * 100} tone={latest.estimatedTotal > latest.budgetAmount ? "amber" : "forest"} /></div>
                <p className="mt-2 text-xs text-forest-600">
                  {latest.budgetRemaining >= 0 ? `${money(latest.budgetRemaining, latest.currency)} remaining` : `${money(Math.abs(latest.budgetRemaining), latest.currency)} over budget`}
                </p>
              </>
            ) : (
              <p className="muted mt-2">Set a weekly budget in onboarding or Settings to see how plans track against it.</p>
            )}
            <Link href="/budget" className="btn-ghost mt-3 px-0 text-forest-700">View budget insights →</Link>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-forest-950">Today’s nutrition</p>
            {todayNutrition ? (
              <div className="mt-3 space-y-3">
                {[
                  ["Calories", todayNutrition.calories, "kcal", 2000],
                  ["Protein", todayNutrition.protein, "g", 100],
                  ["Fiber", todayNutrition.fiber, "g", 30],
                ].map(([l, v, u, target]) => (
                  <div key={String(l)}>
                    <div className="flex justify-between text-xs text-forest-600"><span>{l}</span><span>{Math.round(Number(v))}{u} / ~{target}{u}</span></div>
                    <div className="mt-1"><Progress value={(Number(v) / Number(target)) * 100} tone="lime" /></div>
                  </div>
                ))}
                <p className="text-[10px] text-forest-400">Estimates from fixture nutrition data, not lab-verified.</p>
              </div>
            ) : (
              <p className="muted mt-2">Nutrition appears once you have a plan.</p>
            )}
            <Link href="/nutrition" className="btn-ghost mt-2 px-0 text-forest-700">Open tracker →</Link>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-forest-950">Grocery lists</p>
            {lists.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {lists.slice(0, 3).map((l) => (
                  <li key={l.id}>
                    <Link href={`/grocery/${l.id}`} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm hover:bg-forest-50">
                      <span className="truncate text-forest-800">{l.title.replace("Shopping list — ", "")}</span>
                      <span className="text-xs text-forest-500">{money(l.estimatedTotal, l.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted mt-2">Generated automatically with each meal plan.</p>
            )}
          </Card>
        </div>
      </div>

      <SectionTitle title="Recent plans" action={<Link href="/plans" className="btn-secondary">All plans</Link>} />
      {plans.length === 0 ? (
        <Empty title="Your plans live here" body="Every saved plan keeps its meals, nutrition estimates, budget and grocery list." cta="Generate a plan" href="/planner" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.slice(0, 6).map((p) => (
            <Link key={p.id} href={`/plans/${p.id}`} className="card p-4 transition hover:border-forest-300">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-forest-950">{p.title}</p>
                <Badge tone={p.budgetRemaining >= 0 ? "green" : "amber"}>{p.budgetAmount > 0 ? (p.budgetRemaining >= 0 ? "On budget" : "Over") : "No cap"}</Badge>
              </div>
              <p className="mt-1 text-xs text-forest-500">{p.days.length} days · {p.people} {p.people === 1 ? "person" : "people"} · {p.days.reduce((s, d) => s + d.meals.length, 0)} meals</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-forest-800">{money(p.estimatedTotal, p.currency)}</span>
                <span className="text-[11px] text-forest-400">{prettyDate(p.createdAt.slice(0, 10))}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
