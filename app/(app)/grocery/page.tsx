import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, listLists } from "@/lib/store";
import { money, prettyDate } from "@/lib/utils";
import { Empty } from "@/components/ui";

export default async function GroceryPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const lists = await listLists(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-forest-950">Grocery Lists</h1>
        <p className="muted mt-1">Consolidated shopping lists generated from your meal plans, with estimates and pantry filtering.</p>
      </div>

      {lists.length === 0 ? (
        <Empty title="No shopping lists yet" body="Every meal plan creates a consolidated grocery list automatically." cta="Create a plan" href="/planner" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((l) => {
            const bought = l.items.filter((i) => i.purchased).length;
            return (
              <Link key={l.id} href={`/grocery/${l.id}`} className="card p-5 transition hover:border-forest-300">
                <p className="font-semibold text-forest-950">{l.title.replace("Shopping list — ", "")}</p>
                <p className="mt-0.5 text-xs text-forest-500">{prettyDate(l.createdAt.slice(0, 10))} · {l.items.length} items · {bought} purchased</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-forest-800">Est. {money(l.estimatedTotal, l.currency)}</span>
                  <span className="text-[11px] text-forest-400">{Math.round((bought / Math.max(1, l.items.length)) * 100)}% done</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
