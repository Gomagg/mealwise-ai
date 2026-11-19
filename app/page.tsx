import Link from "next/link";
import { currentUser } from "@/lib/store";
import { PLANS } from "@/lib/plans";
import { Leaf } from "lucide-react";

const FEATURES = [
  { icon: "🎯", title: "Budget-aware planning", body: "Set a daily, weekly or monthly food budget and every plan is built to fit it." },
  { icon: "🥗", title: "Nutrition you can see", body: "Calories, protein, carbs, fat and fibre for every meal, with sources labelled." },
  { icon: "👨‍👩‍👧", title: "Built for households", body: "Portions and shopping quantities scale to the number of people you cook for." },
  { icon: "♻️", title: "Ingredient reuse", body: "Ingredients repeat across meals so you buy less and waste less." },
  { icon: "🛒", title: "Smart grocery lists", body: "Meal plans become one consolidated, editable shopping list with estimates." },
  { icon: "🧺", title: "Pantry intelligence", body: "Cook from what you already have and skip duplicate purchases." },
];

const SEGMENTS = [
  { title: "Families", body: "Child-friendly meals, shared budgets, and portions for everyone at the table." },
  { title: "Fitness", body: "Higher-protein plans for muscle gain, weight loss or maintenance." },
  { title: "Busy professionals", body: "30-minute meals and weekly batch-cooking that removes daily decisions." },
  { title: "Students", body: "Rice, beans, eggs and vegetables turned into affordable, filling meals." },
  { title: "Dietary needs", body: "Vegetarian, vegan, pescatarian, dairy-free, gluten-free and allergy exclusions." },
];

const FAQS = [
  { q: "Are the prices live supermarket prices?", a: "No. Grocery prices are clearly-labelled estimates from a built-in reference table, and you can record your own local market prices. The app never presents an estimate as a confirmed retail price." },
  { q: "Is the nutrition data verified?", a: "The starter library uses nutrition estimates and labels them as such. The data layer is built for USDA FoodData Central and Open Food Facts adapters when credentials are configured." },
  { q: "Does it work without an AI key?", a: "Yes. The planner and assistant run on deterministic rules, so the full journey works without any AI provider. Adding an Anthropic or OpenAI key upgrades the assistant's conversation quality." },
  { q: "Can I change portions or swap meals?", a: "Yes. Every plan lets you replace any meal, prefer cheaper alternatives, mark meals as prepared, and regenerate the grocery list." },
  { q: "Is this medical advice?", a: "No. MEALWISE AI is a food-planning tool. It does not diagnose or treat conditions. For pregnancy, serious allergies, diabetes, kidney disease or eating disorders, consult a qualified professional." },
];

export default async function LandingPage() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b border-forest-100/80 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700 text-white">
              <Leaf size={18} />
            </span>
            <span className="text-sm font-bold tracking-tight text-forest-950">MEALWISE AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-forest-700 md:flex">
            <a href="#how" className="hover:text-forest-900">How it works</a>
            <a href="#features" className="hover:text-forest-900">Features</a>
            <a href="#pricing" className="hover:text-forest-900">Pricing</a>
            <a href="#faq" className="hover:text-forest-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="btn-primary">Open app</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost hidden sm:inline-flex">Log in</Link>
                <Link href="/signup" className="btn-primary">Start free</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-lime-soft blur-3xl" />
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center md:py-24">
            <div className="animate-rise">
              <span className="pill bg-white text-forest-700 ring-1 ring-forest-100">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-accent" /> Budget-first meal planning
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-forest-950 md:text-5xl">
                Your Food Budget. Your Nutrition Goals. One Smarter Meal Plan.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-forest-700">
                MEALWISE AI creates personalized meal plans, calculates grocery lists, and helps you eat
                better without overspending.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={user ? "/planner" : "/signup"} className="btn-primary px-5 py-3 text-base">
                  Create My Meal Plan
                </Link>
                <a href="#how" className="btn-secondary px-5 py-3 text-base">Explore How It Works</a>
              </div>
              <p className="mt-4 text-xs text-forest-500">
                Free plan available · No card required · Prices shown are estimates, not live market quotes
              </p>
            </div>

            <div className="relative animate-rise">
              <div className="card overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-forest-100 bg-forest-50/60 px-5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">Sample 7-day plan</p>
                  <span className="pill bg-white text-forest-700">Estimate</span>
                </div>
                <div className="space-y-3 p-5">
                  {[
                    { day: "Mon", meal: "Oatmeal, banana & groundnuts", cost: "₦820", kcal: "390 kcal" },
                    { day: "Tue", meal: "Jollof rice with grilled chicken", cost: "₦2,640", kcal: "640 kcal" },
                    { day: "Wed", meal: "Beans porridge & fried plantain", cost: "₦1,410", kcal: "520 kcal" },
                    { day: "Thu", meal: "Spaghetti jollof", cost: "₦1,180", kcal: "520 kcal" },
                  ].map((row) => (
                    <div key={row.day} className="flex items-center gap-3 rounded-xl border border-forest-100 px-3 py-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-soft text-xs font-bold text-forest-800">{row.day}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-forest-900">{row.meal}</p>
                        <p className="text-[11px] text-forest-500">{row.kcal} per serving</p>
                      </div>
                      <span className="text-sm font-semibold text-forest-800">{row.cost}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-xl bg-forest-700 px-4 py-3 text-white">
                    <span className="text-xs font-medium uppercase tracking-wide text-forest-100">Weekly estimate</span>
                    <span className="text-sm font-bold">₦14,320 · 7 days</span>
                  </div>
                  <p className="text-center text-[10px] text-forest-400">Illustrative sample data, not a live quote.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-forest-100 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-center text-2xl font-bold tracking-tight text-forest-950 md:text-3xl">From budget to grocery list in four steps</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                { n: "01", t: "Tell us your goal", b: "Budget, household size, dietary needs, allergies and how much time you have to cook." },
                { n: "02", t: "Describe your week", b: "“I have ₦35,000 for food this week, high protein, meals under 30 minutes.”" },
                { n: "03", t: "Get your plan", b: "Breakfast, lunch and dinner for every day with recipes, portions and nutrition estimates." },
                { n: "04", t: "Shop from one list", b: "A consolidated grocery list with quantities and estimates, editable and exportable." },
              ].map((s) => (
                <div key={s.n}>
                  <p className="text-xs font-bold tracking-widest text-lime-accent">{s.n}</p>
                  <h3 className="mt-2 text-base font-semibold text-forest-950">{s.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-forest-600">{s.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-forest-950 md:text-3xl">Everything a food budget actually needs</h2>
          <p className="mt-2 max-w-2xl text-forest-600">Not another recipe site — a planning system that respects your money, your goals and your kitchen.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-soft text-lg">{f.icon}</div>
                <h3 className="mt-3 text-base font-semibold text-forest-950">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-forest-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Segments */}
        <section className="border-y border-forest-100 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-2xl font-bold tracking-tight text-forest-950 md:text-3xl">Made for real households</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {SEGMENTS.map((s) => (
                <div key={s.title} className="rounded-2xl bg-cream p-4">
                  <h3 className="text-sm font-semibold text-forest-950">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-forest-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-forest-950 md:text-3xl">Simple pricing</h2>
          <p className="mt-2 text-forest-600">Start free. Upgrade when you want unlimited planning for your household.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {Object.values(PLANS).map((p) => (
              <div key={p.id} className={`card flex flex-col p-6 ${p.id === "smart" ? "ring-2 ring-forest-600" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-forest-950">{p.name}</h3>
                  {p.id === "smart" ? <span className="pill bg-lime-soft text-forest-800">Popular</span> : null}
                </div>
                <p className="mt-1 text-xs text-forest-500">{p.tagline}</p>
                <p className="mt-4 text-3xl font-bold tracking-tight text-forest-950">
                  ${p.priceUSD.toFixed(2)}
                  <span className="text-sm font-medium text-forest-500">/month</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-forest-700">
                      <span className="text-forest-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="btn-primary mt-5 w-full">
                  {p.id === "free" ? "Start free" : `Choose ${p.name}`}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-forest-500">
            Prices are initial product hypotheses in USD. Live checkout requires payment provider credentials.
          </p>
        </section>

        {/* Testimonials */}
        <section className="border-y border-forest-100 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="text-2xl font-bold tracking-tight text-forest-950">What early users say</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-forest-400">Placeholder testimonials — no real customer quotes yet</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { q: "Planning a week of family meals used to take an hour. Now it’s one prompt and a shopping list.", n: "Placeholder name", r: "Parent of two" },
                { q: "The budget swaps are the part I didn’t expect — it keeps the meals but cuts the cost.", n: "Placeholder name", r: "Student" },
                { q: "Protein targets without guessing. I can see every meal’s numbers before I cook.", n: "Placeholder name", r: "Gym member" },
              ].map((t) => (
                <div key={t.q} className="rounded-2xl bg-cream p-5">
                  <p className="text-sm leading-relaxed text-forest-800">“{t.q}”</p>
                  <p className="mt-4 text-xs font-semibold text-forest-950">{t.n}</p>
                  <p className="text-[11px] text-forest-500">{t.r}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-forest-950 md:text-3xl">Questions, answered</h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="card group p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-forest-950">
                  {f.q}
                  <span className="text-forest-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-forest-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-20">
          <div className="rounded-3xl bg-forest-800 px-6 py-12 text-center text-white">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Eat better. Spend smarter. Waste less.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-forest-100">
              Create your first seven-day plan in minutes, with a grocery list you can actually use.
            </p>
            <Link href="/signup" className="btn mt-6 bg-lime-accent px-6 py-3 text-base font-bold text-forest-950 hover:bg-lime-soft">
              Create My Meal Plan
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-forest-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-forest-950"><Leaf size={16} /> MEALWISE AI</p>
            <p className="mt-2 text-xs leading-relaxed text-forest-500">
              AI meal planning, nutrition and grocery budget management. Food-planning guidance only — not medical advice.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-forest-700">
              <li><a href="#features" className="hover:text-forest-950">Features</a></li>
              <li><a href="#pricing" className="hover:text-forest-950">Pricing</a></li>
              <li><Link href="/signup" className="hover:text-forest-950">Sign up</Link></li>
              <li><Link href="/login" className="hover:text-forest-950">Log in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-forest-700">
              <li><a href="#how" className="hover:text-forest-950">How it works</a></li>
              <li><a href="#faq" className="hover:text-forest-950">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-forest-700">
              <li><span className="text-forest-500">Terms — pending review</span></li>
              <li><span className="text-forest-500">Privacy — pending review</span></li>
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-forest-400">
              No claims of HIPAA/GDPR/NDPA compliance. Regulatory requirements need professional review.
            </p>
          </div>
        </div>
        <div className="border-t border-forest-100 px-5 py-5 text-center text-xs text-forest-400">
          © {new Date().getFullYear()} MEALWISE AI. Nutrition and price figures are estimates, not verified data.
        </div>
      </footer>
    </div>
  );
}
