import Link from "next/link";
import { currentUser, listPlans } from "@/lib/store";
import { redirect } from "next/navigation";
import { money, prettyDate } from "@/lib/utils";
import { Badge, Empty } from "@/components/ui";

export default async function PlansPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const plans = await listPlans(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-forest-950">My Meal Plans</h1>
          <p className="muted mt-1">Saved plans with meals, estimates and grocery lists.</p>
        </div>
        <Link href="/planner" className="btn-primary">New plan</Link>
      </div>

      {plans.length === 0 ? (
        <Empty title="No saved plans yet" body="Generate your first plan and it will appear here with its recipes and shopping list." cta="Create a plan" href="/planner" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => {
            const meals = p.days.reduce((s, d) => s + d.meals.length, 0);
            const prepared = p.days.reduce((s, d) => s + d.meals.filter((m) => m.prepared).length, 0);
            return (
              <Link key={p.id} href={`/plans/${p.id}`} className="card p-5 transition hover:border-forest-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-forest-950">{p.title}</p>
                    <p className="mt-0.5 text-xs text-forest-500">{prettyDate(p.createdAt.slice(0, 10))} · {p.people} {p.people === 1 ? "person" : "people"} · {meals} meals</p>
                  </div>
                  <Badge tone={p.budgetAmount === 0 ? "gray" : p.budgetRemaining >= 0 ? "green" : "amber"}>
                    {p.budgetAmount === 0 ? "No cap" : p.budgetRemaining >= 0 ? "On budget" : "Over budget"}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-forest-50 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-forest-500">Estimate</p>
                    <p className="text-sm font-semibold text-forest-900">{money(p.estimatedTotal, p.currency)}</p>
                  </div>
                  <div className="rounded-xl bg-forest-50 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-forest-500">Budget</p>
                    <p className="text-sm font-semibold text-forest-900">{p.budgetAmount ? money(p.budgetAmount, p.currency) : "—"}</p>
                  </div>
                  <div className="rounded-xl bg-forest-50 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-forest-500">Prepared</p>
                    <p className="text-sm font-semibold text-forest-900">{prepared}/{meals}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
