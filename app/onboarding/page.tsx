import { redirect } from "next/navigation";
import { currentUser, getPreferences } from "@/lib/store";
import { saveOnboardingAction } from "../actions";
import { Leaf } from "lucide-react";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "CAD", "AUD", "GHS", "KES", "ZAR"];
const CUISINES = ["Nigerian", "International", "West African", "Mediterranean", "Asian"];

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const existing = await getPreferences(user.id);

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-forest-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2 text-sm font-bold text-forest-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-700 text-white"><Leaf size={16} /></span>
            MEALWISE AI
          </span>
          <span className="text-xs text-forest-500">Step 1 of 1 · about 2 minutes</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-forest-950">Let’s set up your food profile</h1>
        <p className="muted mt-1">Everything is optional except your name and budget — you can change it all later in Settings.</p>

        <form action={saveOnboardingAction} className="mt-6 space-y-5">
          <section className="card p-6">
            <h2 className="text-base font-semibold text-forest-950">Personal</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="displayName">Display name</label>
                <input id="displayName" name="displayName" className="input" defaultValue={existing?.displayName ?? ""} placeholder="Ada" required />
              </div>
              <div>
                <label className="label" htmlFor="country">Country</label>
                <input id="country" name="country" className="input" defaultValue={existing?.country ?? "Nigeria"} />
              </div>
              <div>
                <label className="label" htmlFor="city">City / region (optional)</label>
                <input id="city" name="city" className="input" defaultValue={existing?.city ?? ""} placeholder="Lagos" />
              </div>
              <div>
                <label className="label" htmlFor="currency">Currency</label>
                <select id="currency" name="currency" className="input" defaultValue={existing?.currency ?? "NGN"}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="language">Language</label>
                <select id="language" name="language" className="input" defaultValue={existing?.language ?? "en"}>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="timezone">Time zone</label>
                <input id="timezone" name="timezone" className="input" defaultValue={existing?.timezone ?? "Africa/Lagos"} />
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-forest-950">Household</h2>
            <p className="muted mt-0.5">We use this to scale portions and shopping quantities.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="adults">Adults</label>
                <input id="adults" name="adults" type="number" min={1} max={12} defaultValue={existing?.household.adults ?? 1} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="children">Children</label>
                <input id="children" name="children" type="number" min={0} max={12} defaultValue={existing?.household.children ?? 0} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="peopleFed">People fed per meal</label>
                <input id="peopleFed" name="peopleFed" type="number" min={1} max={12} defaultValue={existing?.household.peopleFed ?? 1} className="input" />
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-forest-950">Food preferences</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="favoriteFoods">Favourite foods (comma separated)</label>
                <input id="favoriteFoods" name="favoriteFoods" className="input" defaultValue={existing?.favoriteFoods.join(", ") ?? ""} placeholder="rice, chicken, plantain" />
              </div>
              <div>
                <label className="label" htmlFor="dislikedFoods">Disliked foods</label>
                <input id="dislikedFoods" name="dislikedFoods" className="input" defaultValue={existing?.dislikedFoods.join(", ") ?? ""} placeholder="liver, okra" />
              </div>
              <div className="sm:col-span-2">
                <p className="label">Preferred cuisines</p>
                <div className="flex flex-wrap gap-3">
                  {CUISINES.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm text-forest-700">
                      <input type="checkbox" name="cuisines" value={c.toLowerCase()} defaultChecked={existing?.preferredCuisines.includes(c.toLowerCase())} className="h-4 w-4 rounded border-forest-300 text-forest-600" />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="maxCookMinutes">Maximum cooking time (minutes)</label>
                <input id="maxCookMinutes" name="maxCookMinutes" type="number" min={10} max={180} step={5} defaultValue={existing?.maxCookMinutes ?? 45} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="cookingFreq">How often do you cook?</label>
                <select id="cookingFreq" name="cookingFreq" className="input" defaultValue={existing?.cookingFreq ?? "daily"}>
                  <option value="daily">Daily</option>
                  <option value="most_days">Most days</option>
                  <option value="weekends">Weekends / batch cooking</option>
                  <option value="rarely">Rarely</option>
                </select>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-forest-950">Dietary needs & allergies</h2>
            <p className="muted mt-0.5">Explicit only. We never infer medical conditions from preferences.</p>
            <div className="mt-4 flex flex-wrap gap-4">
              {["none", "vegetarian", "vegan", "pescatarian", "dairy_free", "gluten_free"].map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm capitalize text-forest-700">
                  <input type="checkbox" name="dietary" value={d} defaultChecked={d === "none" ? (existing?.dietary.length ?? 0) === 0 : existing?.dietary.includes(d)} className="h-4 w-4 rounded border-forest-300 text-forest-600" />
                  {d.replace("_", "-")}
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              {["nuts", "eggs", "fish", "shellfish", "dairy", "gluten", "soy"].map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm capitalize text-forest-700">
                  <input type="checkbox" name="allergies" value={a} defaultChecked={existing?.allergies.includes(a)} className="h-4 w-4 rounded border-forest-300 text-forest-600" />
                  {a} allergy
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              For serious allergies or medical dietary requirements, confirm your plan with a qualified dietitian. This app does not replace medical advice.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-forest-950">Nutrition goal</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["general", "General healthy eating"],
                ["maintain", "Weight maintenance"],
                ["weight_loss", "Weight loss (moderate)"],
                ["muscle_gain", "Muscle gain"],
                ["high_protein", "Higher-protein eating"],
                ["balanced", "Balanced nutrition"],
              ].map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 rounded-xl border border-forest-100 px-3 py-2.5 text-sm text-forest-800">
                  <input type="radio" name="goal" value={v} defaultChecked={(existing?.goal ?? "general") === v} className="h-4 w-4 text-forest-600" />
                  {l}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="activity">Activity level</label>
                <select id="activity" name="activity" className="input" defaultValue={existing?.activity ?? "moderate"}>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Lightly active</option>
                  <option value="moderate">Moderately active</option>
                  <option value="very">Very active</option>
                </select>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-forest-950">Meals per day</h2>
            <div className="mt-4 flex flex-wrap gap-4">
              {[
                ["meal_breakfast", "Breakfast"],
                ["meal_morning_snack", "Morning snack"],
                ["meal_lunch", "Lunch"],
                ["meal_afternoon_snack", "Afternoon snack"],
                ["meal_dinner", "Dinner"],
                ["meal_evening_snack", "Evening snack"],
              ].map(([name, l]) => {
                const defaults = existing?.mealsPerDay ?? ["breakfast", "lunch", "dinner"];
                const key = name.replace("meal_", "");
                return (
                  <label key={name} className="flex items-center gap-2 text-sm text-forest-700">
                    <input type="checkbox" name={name} defaultChecked={defaults.includes(key as never)} className="h-4 w-4 rounded border-forest-300 text-forest-600" />
                    {l}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-forest-950">Food budget</h2>
            <p className="muted mt-0.5">The planner fits every plan to this number. Prices are estimates, not live quotes.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="weeklyBudget">Weekly budget</label>
                <input id="weeklyBudget" name="weeklyBudget" type="number" min={0} step="0.01" defaultValue={existing?.budget.weekly ?? 35000} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="dailyBudget">Daily budget (optional)</label>
                <input id="dailyBudget" name="dailyBudget" type="number" min={0} step="0.01" defaultValue={existing?.budget.daily ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="monthlyBudget">Monthly budget (optional)</label>
                <input id="monthlyBudget" name="monthlyBudget" type="number" min={0} step="0.01" defaultValue={existing?.budget.monthly ?? ""} className="input" />
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-forest-700">
              <input type="checkbox" name="includesSnacks" defaultChecked={existing?.budget.includesSnacks ?? true} className="h-4 w-4 rounded border-forest-300 text-forest-600" />
              Budget includes snacks and drinks
            </label>
          </section>

          <div className="flex flex-col gap-3 pb-10 sm:flex-row sm:justify-end">
            <button type="submit" className="btn-primary px-6 py-3">Save and open my dashboard</button>
          </div>
        </form>
      </main>
    </div>
  );
}
