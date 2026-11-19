-- MEALWISE AI — initial production schema (Supabase / PostgreSQL)
-- Apply with: supabase db push  (or run this file in the SQL editor)
--
-- The development fallback stores JSON in .data/db.json. This schema is the
-- normalised production target. Every table is scoped to the owning user and
-- protected by row-level security; the Next.js server uses the service role key
-- only for server-side operations after verifying its own httpOnly session.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  plan text not null default 'free' check (plan in ('free', 'smart', 'family_pro')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Server-side session tokens issued by the app (opaque, httpOnly cookie).
create table if not exists public.app_sessions (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists app_sessions_user_idx on public.app_sessions(user_id);

-- ---------------------------------------------------------------------------
-- preferences and household (JSONB keeps the shape versionable without a wide
-- table; household_members is where per-person profiles will live)
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  role text not null default 'adult' check (role in ('adult', 'child')),
  dietary text[] not null default '{}',
  allergies text[] not null default '{}',
  invited_email text,
  invitation_status text not null default 'pending'
    check (invitation_status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create index if not exists household_members_owner_idx on public.household_members(owner_id);

-- ---------------------------------------------------------------------------
-- meal plans and grocery lists (days/items are structured JSONB documents)
-- ---------------------------------------------------------------------------
create table if not exists public.meal_plans (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  days jsonb not null default '[]'::jsonb,
  people int not null default 1,
  budget_amount numeric(12, 2) not null default 0,
  currency text not null default 'NGN',
  estimated_total numeric(12, 2) not null default 0,
  budget_remaining numeric(12, 2) not null default 0,
  goal text not null default 'general',
  restrictions text[] not null default '{}',
  notes text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);
create index if not exists meal_plans_user_created_idx on public.meal_plans(user_id, created_at desc);

create table if not exists public.grocery_lists (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_plan_id text references public.meal_plans(id) on delete set null,
  title text not null,
  currency text not null default 'NGN',
  items jsonb not null default '[]'::jsonb,
  estimated_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists grocery_lists_user_created_idx on public.grocery_lists(user_id, created_at desc);

create table if not exists public.pantry_items (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  qty numeric(12, 3) not null default 1,
  unit text not null default 'piece',
  purchase_date date,
  expiration_date date,
  location text,
  estimated_cost numeric(12, 2),
  created_at timestamptz not null default now()
);
create index if not exists pantry_items_user_idx on public.pantry_items(user_id);
create index if not exists pantry_items_user_name_idx on public.pantry_items(user_id, lower(name));

-- ---------------------------------------------------------------------------
-- assistant conversations, favourites, usage and agent audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations(user_id, created_at desc);

create table if not exists public.favorite_recipes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table if not exists public.usage_ledger (
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null, -- YYYY-MM
  data jsonb not null default '{"plansGenerated":0,"assistantMessages":0}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

create table if not exists public.ai_agent_runs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  agent text not null,
  action text not null,
  status text not null check (status in ('ok', 'error', 'fallback')),
  detail text,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists ai_agent_runs_user_idx on public.ai_agent_runs(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists user_preferences_touch on public.user_preferences;
create trigger user_preferences_touch before update on public.user_preferences
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: each user only sees their own rows.
-- The server-side app connects with the service role, which bypasses RLS by
-- design, but these policies keep the anon/authenticated keys safe.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.household_members enable row level security;
alter table public.meal_plans enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.pantry_items enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.favorite_recipes enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.ai_agent_runs enable row level security;
alter table public.app_sessions enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for select using (auth.uid() = id);

drop policy if exists prefs_self on public.user_preferences;
create policy prefs_self on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists household_owner on public.household_members;
create policy household_owner on public.household_members
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists plans_owner on public.meal_plans;
create policy plans_owner on public.meal_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists lists_owner on public.grocery_lists;
create policy lists_owner on public.grocery_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists pantry_owner on public.pantry_items;
create policy pantry_owner on public.pantry_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists conversations_owner on public.ai_conversations;
create policy conversations_owner on public.ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists favorites_owner on public.favorite_recipes;
create policy favorites_owner on public.favorite_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists usage_owner on public.usage_ledger;
create policy usage_owner on public.usage_ledger
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists agent_runs_owner on public.ai_agent_runs;
create policy agent_runs_owner on public.ai_agent_runs
  for select using (auth.uid() = user_id);

drop policy if exists sessions_owner on public.app_sessions;
create policy sessions_owner on public.app_sessions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New-user bootstrap: create the profile row when Supabase Auth creates a user.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
