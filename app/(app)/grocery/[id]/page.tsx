import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, getList } from "@/lib/store";
import { money } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";
import { toggleGroceryItemAction, addGroceryItemAction, recalcListAction } from "../../../actions";

export default async function GroceryDetailPage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const list = await getList(user.id, params.id);
  if (!list) notFound();

  const categories = [...new Set(list.items.map((i) => i.category))];
  const bought = list.items.filter((i) => i.purchased).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/grocery" className="text-xs font-medium text-forest-500 hover:text-forest-800">← All lists</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-forest-950">{list.title.replace("Shopping list — ", "")}</h1>
          <p className="muted mt-1">{list.items.length} items · {bought} purchased · estimates only, not live market quotes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/grocery-lists/${list.id}/csv`} className="btn-secondary">Export CSV</a>
          <a href={`/api/grocery-lists/${list.id}/print`} className="btn-secondary" target="_blank" rel="noreferrer">Print / PDF</a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-500">Estimated total</p>
          <p className="mt-1 text-2xl font-bold text-forest-950">{money(list.estimatedTotal, list.currency)}</p>
          <p className="text-xs text-forest-500">Fixture estimates</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-500">Still to buy</p>
          <p className="mt-1 text-2xl font-bold text-forest-950">{list.items.length - bought}</p>
          <p className="text-xs text-forest-500">Tick items off as you shop</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-500">Estimated remaining</p>
          <p className="mt-1 text-2xl font-bold text-forest-950">{money(list.items.filter((i) => !i.purchased).reduce((s, i) => s + i.estimatedCost, 0), list.currency)}</p>
          <p className="text-xs text-forest-500">Of unbought items</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {categories.map((cat) => (
            <div key={cat} className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-forest-100 bg-forest-50/50 px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-forest-700">{cat}</p>
                <p className="text-[11px] text-forest-500">{money(list.items.filter((i) => i.category === cat).reduce((s, i) => s + i.estimatedCost, 0), list.currency)}</p>
              </div>
              <ul className="divide-y divide-forest-50">
                {list.items.filter((i) => i.category === cat).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <form action={toggleGroceryItemAction}>
                      <input type="hidden" name="listId" value={list.id} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${item.purchased ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200 bg-white text-transparent"}`}
                        aria-label={item.purchased ? "Mark unpurchased" : "Mark purchased"}
                      >
                        ✓
                      </button>
                    </form>
                    <span className={`flex-1 text-sm ${item.purchased ? "text-forest-400 line-through" : "text-forest-900"}`}>{item.name}</span>
                    <span className="text-xs text-forest-500">{item.qty} {item.unit}</span>
                    <span className="w-20 text-right text-xs font-semibold text-forest-800">{money(item.estimatedCost, list.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {list.items.length === 0 ? (
            <div className="card p-8 text-center text-sm text-forest-600">
              Everything on this list is already in your pantry. Nothing to buy.
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-forest-950">Add an item</p>
            <form action={addGroceryItemAction} className="mt-3 space-y-2">
              <input type="hidden" name="listId" value={list.id} />
              <input name="name" required className="input" placeholder="Item name" />
              <div className="grid grid-cols-3 gap-2">
                <input name="qty" type="number" min={0.1} step="0.1" defaultValue={1} className="input" aria-label="Quantity" />
                <select name="unit" className="input" aria-label="Unit">
                  <option>piece</option><option>g</option><option>kg</option><option>ml</option><option>litre</option><option>bunch</option>
                </select>
                <input name="cost" type="number" min={0} step="0.01" placeholder="Est." className="input" aria-label="Estimated cost" />
              </div>
              <button className="btn-primary w-full">Add to list</button>
            </form>
          </Card>

          {list.mealPlanId ? (
            <Card>
              <p className="text-sm font-semibold text-forest-950">Rebuild from plan</p>
              <p className="mt-1 text-xs text-forest-600">Quantities and costs should follow the latest plan and pantry.</p>
              <form action={recalcListAction} className="mt-3">
                <input type="hidden" name="planId" value={list.mealPlanId} />
                <button className="btn-secondary w-full">Regenerate list</button>
              </form>
            </Card>
          ) : null}

          <Card>
            <p className="text-sm font-semibold text-forest-950">Notes</p>
            <ul className="mt-2 space-y-1.5 text-xs text-forest-600">
              <li>• Prices are built-in estimates; record your own in Settings later.</li>
              <li>• Pantry items are excluded automatically.</li>
              <li>• Duplicate ingredients are merged across meals.</li>
              <li>• CSV and print/PDF export are both available.</li>
            </ul>
            <Badge tone="amber">Estimates, not live quotes</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
}
