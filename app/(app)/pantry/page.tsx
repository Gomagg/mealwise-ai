import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, listPantry } from "@/lib/store";
import { pantrySuggestions } from "@/lib/assistant";
import { Badge, Card, Empty } from "@/components/ui";
import { addPantryItemAction, deletePantryItemAction } from "../../actions";

export default async function PantryPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const pantry = await listPantry(user.id);
  const suggestions = pantrySuggestions(pantry);
  const soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-forest-950">Pantry</h1>
        <p className="muted mt-1">Record what you have. Meal plans and grocery lists skip these items, and the assistant suggests meals you can cook now.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {pantry.length === 0 ? (
            <Empty title="Your pantry is empty" body="Add rice, beans, eggs, oil or anything you already have at home." />
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-forest-50/60 text-left text-[11px] uppercase tracking-wide text-forest-500">
                  <tr>
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5">Qty</th>
                    <th className="hidden px-4 py-2.5 sm:table-cell">Expires</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Location</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {pantry.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-medium capitalize text-forest-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-forest-600">{p.qty} {p.unit}</td>
                      <td className="hidden px-4 py-2.5 text-forest-600 sm:table-cell">
                        {p.expirationDate ? (
                          <Badge tone={p.expirationDate <= soon ? "amber" : "gray"}>{p.expirationDate}</Badge>
                        ) : "—"}
                      </td>
                      <td className="hidden px-4 py-2.5 capitalize text-forest-600 md:table-cell">{p.location ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <form action={deletePantryItemAction}>
                          <input type="hidden" name="itemId" value={p.id} />
                          <button className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Card>
            <p className="text-sm font-semibold text-forest-950">Cook from your pantry</p>
            <p className="mt-0.5 text-xs text-forest-500">Recipes ranked by how much of them you already have.</p>
            {suggestions.length === 0 ? (
              <p className="mt-3 text-sm text-forest-600">Add a few more ingredients to see recipe matches.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {suggestions.map((s) => (
                  <li key={s.recipeId} className="flex items-start gap-3 rounded-xl border border-forest-100 px-3 py-2.5">
                    <span className="text-lg">{s.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-forest-900">{s.name}</p>
                      <p className="text-[11px] text-forest-500">
                        {s.coverage}% covered{s.missing.length ? ` · missing: ${s.missing.slice(0, 4).map((m) => m.replace(/_/g, " ")).join(", ")}` : " · you have everything"}
                      </p>
                    </div>
                    <span className="text-[11px] text-forest-400">{s.minutes} min</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/assistant" className="btn-ghost mt-3 px-0 text-forest-700">Ask the assistant what to cook →</Link>
          </Card>
        </div>

        <Card className="h-fit">
          <p className="text-sm font-semibold text-forest-950">Add an item</p>
          <form action={addPantryItemAction} className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="name">Ingredient</label>
              <input id="name" name="name" required className="input" placeholder="e.g. rice, eggs, spinach" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="qty">Quantity</label>
                <input id="qty" name="qty" type="number" min={0.1} step="0.1" defaultValue={1} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="unit">Unit</label>
                <select id="unit" name="unit" className="input">
                  <option>piece</option><option>g</option><option>kg</option><option>ml</option><option>litre</option><option>bunch</option><option>derica</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="purchaseDate">Bought</label>
                <input id="purchaseDate" name="purchaseDate" type="date" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="expirationDate">Expires</label>
                <input id="expirationDate" name="expirationDate" type="date" className="input" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="location">Storage location</label>
              <select id="location" name="location" className="input">
                <option value="">Select…</option>
                <option value="cupboard">Cupboard</option>
                <option value="fridge">Fridge</option>
                <option value="freezer">Freezer</option>
              </select>
            </div>
            <button className="btn-primary w-full">Add to pantry</button>
          </form>
          <p className="mt-3 text-[11px] text-forest-400">
            Pantry data is private to your account. Items expiring within 3 days are flagged.
          </p>
        </Card>
      </div>
    </div>
  );
}
