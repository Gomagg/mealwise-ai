import { currentUser, getFavorites } from "@/lib/store";
import { redirect } from "next/navigation";
import { RECIPE_LIBRARY } from "@/lib/food-data";
import { costOfRecipe } from "@/lib/engine";
import { getPreferences } from "@/lib/store";
import { money } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { toggleFavoriteAction } from "../../actions";

export default async function RecipesPage({ searchParams }: { searchParams: { q?: string; diet?: string; max?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  const favorites = await getFavorites(user.id);
  const currency = prefs?.currency ?? "NGN";

  const q = (searchParams.q ?? "").toLowerCase();
  const diet = searchParams.diet ?? "";
  const max = Number(searchParams.max ?? 0);

  const recipes = RECIPE_LIBRARY.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q) && !r.ingredients.some((i) => i.item.includes(q))) return false;
    if (diet && !r.dietary.includes(diet)) return false;
    if (max > 0 && r.prepMinutes + r.cookMinutes > max) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-forest-950">Recipes</h1>
        <p className="muted mt-1">{RECIPE_LIBRARY.length} original recipes with per-serving nutrition estimates and cost estimates.</p>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={searchParams.q ?? ""} className="input" placeholder="Recipe or ingredient…" />
        </div>
        <div>
          <label className="label" htmlFor="diet">Diet</label>
          <select id="diet" name="diet" defaultValue={diet} className="input">
            <option value="">Any</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="pescatarian">Pescatarian</option>
            <option value="high_protein">High protein</option>
            <option value="low_cost">Low cost</option>
            <option value="quick">Quick</option>
            <option value="family">Family</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="max">Max time</label>
          <select id="max" name="max" defaultValue={String(max || "")} className="input">
            <option value="">Any</option>
            <option value="20">≤ 20 min</option>
            <option value="30">≤ 30 min</option>
            <option value="45">≤ 45 min</option>
          </select>
        </div>
        <button className="btn-primary" type="submit">Filter</button>
      </form>

      {recipes.length === 0 ? (
        <div className="card p-10 text-center text-sm text-forest-600">No recipes match those filters. Try clearing the search.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((r) => {
            const cost = costOfRecipe(r, currency);
            const fav = favorites.includes(r.id);
            return (
              <div key={r.id} className="card overflow-hidden p-0">
                <div className="flex items-start gap-3 p-4 pb-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-soft text-xl">{r.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-forest-950">{r.name}</p>
                    <p className="text-[11px] text-forest-500">{r.prepMinutes + r.cookMinutes} min · serves {r.servingsBase} · {money(cost / r.servingsBase, currency)}/serving</p>
                  </div>
                  <form action={toggleFavoriteAction}>
                    <input type="hidden" name="recipeId" value={r.id} />
                    <button className="text-lg" aria-label={fav ? "Remove favourite" : "Save favourite"}>{fav ? "★" : "☆"}</button>
                  </form>
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                  <Badge tone="gray">{r.perServing.calories} kcal</Badge>
                  <Badge tone="green">{r.perServing.protein}g protein</Badge>
                  {r.dietary.slice(0, 2).map((d) => <Badge key={d} tone="lime">{d.replace("_", " ")}</Badge>)}
                </div>
                <details className="border-t border-forest-100">
                  <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-forest-700">Ingredients & steps</summary>
                  <div className="space-y-3 px-4 pb-4 text-xs text-forest-600">
                    <ul className="list-inside list-disc">
                      {r.ingredients.map((i) => <li key={i.item}>{i.qty} {i.unit} {i.item.replace(/_/g, " ")}</li>)}
                    </ul>
                    <ol className="list-inside list-decimal space-y-1">
                      {r.instructions.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                    <p className="text-[10px] text-forest-400">Nutrition and costs are estimates, not verified data.</p>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
