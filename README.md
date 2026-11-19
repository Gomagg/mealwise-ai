# MEALWISE AI

**Your Food Budget. Your Nutrition Goals. One Smarter Meal Plan.**

MEALWISE AI builds 7-day (or 1–30 day) meal plans around what you can actually spend, calculates
per-serving nutrition and a consolidated grocery list, and tracks your pantry. It runs end to end
with **no third-party credentials** using transparent development fallbacks, and upgrades to
Supabase, Anthropic/OpenAI and payments when those environment variables are set.

> Nutrition values and grocery prices are **planning estimates from fixture data**, not live market
> quotes or lab measurements. The app labels them as such everywhere. It is a food-planning tool,
> not medical advice.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — every integration has a fallback
npm run dev                  # http://localhost:3000
```

Create an account, complete onboarding, and generate a plan. Data is stored in `.data/db.json`
when Supabase is not configured.

```bash
npm run build   # production build
npm start       # serve the production build
npm test        # deterministic engine tests (Vitest)
```

Node 20+ is required. Built with Next.js 14 App Router, TypeScript (strict), Tailwind CSS.

---

## What is implemented

| Area | Behaviour |
| --- | --- |
| Auth | Email + password. Supabase Auth admin flow when configured, otherwise scrypt hashing + a httpOnly `mealwise_session` cookie. |
| Onboarding | Household size, currency, cuisines, disliked foods, dietary needs, allergies, goal, activity, cooking time, meals per day, daily/weekly/monthly budget. |
| Planner | Natural-language request → parsed budget, days, people, goal, restrictions, allergies, time cap → deterministic recipe scoring → budget swaps → server-computed totals. |
| Meal plans | Day-by-day schedule, recipe detail, per-meal costs, nutrition, prepared tracking, cheaper swaps and replacement, delete. |
| Grocery lists | Consolidated quantities across meals, pantry exclusion, category grouping, tick-off, add item, regenerate, CSV export, print/PDF view. |
| Nutrition | Daily averages vs heuristic targets, macro bars, calorie trend, meal distribution, per-day table. |
| Pantry | Add/remove items with quantity, unit, purchase/expiry dates and storage location; expiry flags; "cook from pantry" recipe ranking. |
| Budget | Planned vs budget chart, adherence, cost per meal/person/day, cheapest plan. |
| Assistant | Anthropic/OpenAI with failover when keys exist; otherwise a rule-based assistant. Conversations persisted, monthly limits enforced. |
| Recipes | 46 original recipes with dietary tags, allergens, time, ingredients, steps, fixture nutrition and cost per serving. Favourites. |
| Billing | Configuration-gated. With no provider keys, checkout returns a clear 501 and never upgrades an account. |
| Privacy | JSON data export at `/api/export`, private per-user rows, RLS in the production schema. |

### Deliberately deferred

These are scaffolded/documented rather than half-implemented:

- Admin dashboard (no admin UI in this release).
- Email delivery (verification, password reset, household invitations) — requires `RESEND_API_KEY`.
- Per-member household profiles — `household_members` table exists in the migration; one combined
  household profile is active today.
- Live payment checkout — adapter seam + webhook stub only.
- USDA FoodData Central / Open Food Facts nutrition adapters — the data-source type exists, the
  fixture estimate is the active source. No health or regulatory compliance claims are made.

---

## Architecture

```
app/
  (app)/            authenticated shell: dashboard, planner, plans, recipes, grocery,
                    nutrition, pantry, household, budget, settings, assistant
  api/              JSON endpoints + CSV/print/export
  actions.ts        server actions for forms
lib/
  engine.ts         deterministic cost, nutrition, grocery and planning engine
  food-data.ts      ingredient price table + original recipe library (fixture data)
  db.ts             Supabase + JSON file store behind one interface
  ai.ts             provider calls, plan orchestration, assistant fallback
  ai-config.ts      provider detection
  ai-safety.ts      untrusted-text sanitising
  plans.ts          subscription limits
supabase/migrations/0001_init.sql   normalised production schema + RLS
tests/engine.test.ts                engine unit tests
```

**The AI never owns numbers.** The assistant only writes prose and suggestions; budgets, portions,
costs, nutrition totals and grocery quantities are always calculated by `lib/engine.ts` on the server.

### Data backend selection

```
NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY  -> Supabase
otherwise                                              -> .data/db.json (development only)
```

Run the migration in `supabase/migrations/0001_init.sql` before pointing the app at Supabase.

### AI provider selection

`AI_DEFAULT_PROVIDER` can be `anthropic` or `openai`; otherwise the first available key is used and
failure fails over to the other provider. With neither key the rule-based assistant answers.

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/meal-plans/generate` | `{ prompt }` → plan + grocery list (usage limits enforced) |
| GET | `/api/profile` | Account + preferences |
| GET/PATCH | `/api/preferences` | Read or update user-editable preferences |
| GET/POST/DELETE | `/api/pantry` | List, add, delete (`?id=`) pantry items |
| GET | `/api/nutrition/daily?date=YYYY-MM-DD` | Day nutrition and meals from latest plan |
| POST | `/api/assistant/chat` | `{ message, conversationId? }` → reply |
| POST | `/api/billing/checkout` | Configuration-gated checkout seam |
| POST | `/api/billing/webhook` | Rejects unsigned/unconfigured events |
| GET | `/api/grocery-lists/[id]/csv` | CSV download |
| GET | `/api/grocery-lists/[id]/print` | Printable list |
| GET | `/api/export` | Full JSON data export |

All routes require a signed-in session.

---

## Environment variables

See `.env.example`. Nothing is required to run locally. Notable ones:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AI_DEFAULT_PROVIDER`
- `STRIPE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`
- `RESEND_API_KEY`

### Deployment note

On Vercel the JSON fallback is written to the function's temporary directory
(`os.tmpdir()`), because the deployment filesystem is read-only. When a Vercel Blob store is
linked (`BLOB_READ_WRITE_TOKEN` present), the app hydrates the JSON document from Blob on use and
mirrors every write back to `mealwise/db.json`, so accounts, plans and lists survive cold starts
and land on other instances. Blob is a private store; last write wins, so the JSON fallback is still
a demo backend, not a multi-writer production database. For a real deployment, configure Supabase
(`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`), run the migration, and use the Supabase
backend. The build itself needs no credentials.

---

## Safety and honesty rules

- Hard constraints (allergies, vegan/vegetarian, explicit exclusions) filter recipes **before** cost
  optimisation and are validated again after the plan is composed.
- Budget pressure never trades away a dietary constraint; when a budget cannot be met the plan says so.
- Prices are labelled fixture estimates and can be overridden per ingredient.
- Nutrition carries a source label (`fixture_estimate`) and is described as an estimate.
- Testimonials on the marketing page are explicitly marked placeholders.
- No HIPAA/GDPR/NDPA compliance claim is made.
- The assistant refuses medical diagnosis and directs serious dietary/medical cases to a professional.

---

## Tests

```bash
npm test
```

Covers unit conversions and price/cost math, currency conversion, nutrition scaling, natural-language
request parsing (budget/days/people/diet/allergies/time), plan composition constraints, budget
behaviour, validation, grocery consolidation, pantry exclusion and CSV escaping.
