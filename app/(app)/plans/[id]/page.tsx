import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, getPlan, getListForPlan } from "@/lib/store";
import { dayNutrition, NUTRITION_SOURCE } from "@/lib/engine";
import { RECIPE_BY_ID } from "@/lib/food-data";
import { money, prettyDate, label } from "@/lib/utils";
import { Badge, Card, Progress, SectionTitle } from "@/components/ui";
import { replaceMealAction, togglePreparedAction, deletePlanAction } from "../../../actions";

export default async function PlanDetailPage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const plan = await getPlan(user.id, params.id);
  if (!plan) notFound();
  const list = await getListForPlan(user.id, plan.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/plans" className="text-xs font-medium text-forest-500 hover:text-forest-800">← All plans</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-forest-950">{plan.title}</h1>
          <p className="muted mt-1">
            Created {prettyDate(plan.createdAt.slice(0, 10))} · {plan.days.length} days · {plan.people} {plan.people === 1 ? "person" : "people"} · goal: {label(plan.goal)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.restrictions.length > 0 ? plan.restrictions.map((r) => <Badge key={r} tone="lime">{label(r)}</Badge>) : <Badge tone="gray">No restrictions</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {list ? <Link href={`/grocery/${list.id}`} className="btn-secondary">Grocery list</Link> : null}
          <form action={deletePlanAction}>
            <input type="hidden" name="planId" value={plan.id} />
            <button type="submit" className="btn-ghost text-red-600 hover:bg-red-50">Delete plan</button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-500">Estimated total</p>
          <p className="mt-1 text-2xl font-bold text-forest-950">{money(plan.estimatedTotal, plan.currency)}</p>
          <p className="text-xs text-forest-500">Fixture price estimates</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-500">Budget</p>
          <p className="mt-1 text-2xl font-bold text-forest-950">{plan.budgetAmount ? money(plan.budgetAmount, plan.currency) : "None set"}</p>
          {plan.budgetAmount > 0 ? (
            <div className="mt-2">
              <Progress value={(plan.estimatedTotal / plan.budgetAmount) * 100} tone={plan.budgetRemaining >= 0 ? "forest" : "amber"} />
              <p className="mt-1 text-xs text-forest-600">
                {plan.budgetRemaining >= 0 ? `${money(plan.budgetRemaining, plan.currency)} remaining` : `${money(Math.abs(plan.budgetRemaining), plan.currency)} over`}
              </p>
            </div>
          ) : <p className="mt-1 text-xs text-forest-500">Add one in Settings</p>}
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-500">Prepared meals</p>
          <p className="mt-1 text-2xl font-bold text-forest-950">
            {plan.days.reduce((s, d) => s + d.meals.filter((m) => m.prepared).length, 0)}/{plan.days.reduce((s, d) => s + d.meals.length, 0)}
          </p>
          <p className="text-xs text-forest-500">Tick meals off as you cook</p>
        </Card>
      </div>

      {plan.notes ? (
        <div className="rounded-2xl border border-forest-100 bg-white px-4 py-3 text-xs leading-relaxed text-forest-600">
          {plan.notes}
        </div>
      ) : null}

      <SectionTitle title="Your schedule" sub="Tap a meal to see ingredients and cooking steps." />

      <div className="space-y-6">
        {plan.days.map((day, di) => {
          const nutrition = dayNutrition(day);
          return (
            <div key={day.date}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-forest-950">{prettyDate(day.date)}</h3>
                <p className="text-[11px] text-forest-500">{Math.round(nutrition.calories)} kcal · {Math.round(nutrition.protein)}g protein · {Math.round(nutrition.carbs)}g carbs · {Math.round(nutrition.fat)}g fat</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {day.meals.map((meal, mi) => {
                  const recipe = RECIPE_BY_ID.get(meal.recipeId);
                  return (
                    <div key={`${day.date}-${meal.slot}-${mi}`} className={`card overflow-hidden p-0 ${meal.prepared ? "opacity-75" : ""}`}>
                      <div className="flex items-start gap-3 p-4 pb-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-soft text-lg">{recipe?.emoji ?? "🍽️"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-forest-950">{meal.recipeName}</p>
                          <p className="text-[11px] text-forest-500">
                            {label(meal.slot)} · {meal.servings} {meal.servings === 1 ? "serving" : "servings"}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-forest-800">{money(meal.estimatedCost, plan.currency)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                        <Badge tone="gray">{Math.round(meal.perServingNutrition.calories)} kcal</Badge>
                        <Badge tone="green">{Math.round(meal.perServingNutrition.protein)}g protein</Badge>
                        {meal.prepared ? <Badge tone="lime">Prepared</Badge> : null}
                      </div>
                      <details className="border-t border-forest-100">
                        <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-forest-700">Recipe & details</summary>
                        <div className="space-y-3 px-4 pb-4 text-xs text-forest-600">
                          {recipe ? (
                            <>
                              <p className="text-forest-600">
                                {recipe.prepMinutes + recipe.cookMinutes} min · serves {recipe.servingsBase} ({meal.servings} planned) · {recipe.prepMinutes} prep / {recipe.cookMinutes} cook
                              </p>
                              <div>
                                <p className="font-semibold text-forest-800">Ingredients</p>
                                <ul className="mt-1 list-inside list-disc">
                                  {recipe.ingredients.map((ing) => {
                                    const f = meal.servings / recipe.servingsBase;
                                    return <li key={ing.item}>{Math.round(ing.qty * f * 10) / 10} {ing.unit} {ing.item.replace(/_/g, " ")}</li>;
                                  })}
                                </ul>
                              </div>
                              <div>
                                <p className="font-semibold text-forest-800">Steps</p>
                                <ol className="mt-1 list-inside list-decimal space-y-1">
                                  {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                                </ol>
                              </div>
                              <p className="text-[10px] text-forest-400">Nutrition is an estimate (source: {NUTRITION_SOURCE}), not a lab measurement.</p>
                            </>
                          ) : <p>Recipe details unavailable.</p>}
                        </div>
                      </details>
                      <div className="flex divide-x divide-forest-100 border-t border-forest-100 text-xs">
                        <form action={replaceMealAction} className="flex-1">
                          <input type="hidden" name="planId" value={plan.id} />
                          <input type="hidden" name="dayIndex" value={di} />
                          <input type="hidden" name="mealIndex" value={mi} />
                          <input type="hidden" name="cheaper" value="1" />
                          <button className="w-full py-2 font-semibold text-forest-700 hover:bg-forest-50">Cheaper swap</button>
                        </form>
                        <form action={replaceMealAction} className="flex-1">
                          <input type="hidden" name="planId" value={plan.id} />
                          <input type="hidden" name="dayIndex" value={di} />
                          <input type="hidden" name="mealIndex" value={mi} />
                          <button className="w-full py-2 font-semibold text-forest-700 hover:bg-forest-50">Replace</button>
                        </form>
                        <form action={togglePreparedAction} className="flex-1">
                          <input type="hidden" name="planId" value={plan.id} />
                          <input type="hidden" name="dayIndex" value={di} />
                          <input type="hidden" name="mealIndex" value={mi} />
                          <button className="w-full py-2 font-semibold text-forest-700 hover:bg-forest-50">{meal.prepared ? "Undo" : "Prepared"}</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
