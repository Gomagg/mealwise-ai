import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Conversation,
  GroceryList,
  MealPlan,
  PantryItem,
  Plan,
  Preferences,
  Profile,
  Usage,
} from "./types";

// Data layer with two backends behind one interface:
//  - Supabase PostgreSQL + Auth (production; env credentials)
//  - JSON file store (.data/db.json) — transparent development fallback, not
//    for production. The normalized production schema lives in
//    supabase/migrations/0001_init.sql.

export const backend: "supabase" | "file" = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "file";

let sbClient: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!sbClient) {
    sbClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return sbClient;
}

// ------------------------------ file store ---------------------------------

type Db = {
  profiles: Record<string, Profile>;
  emailToId: Record<string, string>;
  sessions: Record<string, string>;
  prefs: Record<string, Preferences>;
  plans: Record<string, MealPlan>;
  lists: Record<string, GroceryList>;
  pantry: Record<string, PantryItem>;
  convs: Record<string, Conversation>;
  usage: Record<string, Usage>;
  favorites: Record<string, string[]>;
  agentRuns: unknown[];
};

const DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "mealwise-ai")
  : path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "db.json");

function emptyDb(): Db {
  return { profiles: {}, emailToId: {}, sessions: {}, prefs: {}, plans: {}, lists: {}, pantry: {}, convs: {}, usage: {}, favorites: {}, agentRuns: [] };
}

// Always read from disk: Next.js may evaluate this module once per server
// bundle (pages vs server actions), so a long-lived in-memory cache would go
// stale between a write and the next page render.
function db(): Db {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as Db;
  } catch {
    return emptyDb();
  }
}

function save(data: Db) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// ------------------------------ auth ---------------------------------------

const COOKIE = "mealwise_session";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString("hex")}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(crypto.scryptSync(password, salt, 32).toString("hex")));
}

export async function register(email: string, password: string): Promise<Profile> {
  email = email.trim().toLowerCase();
  if (backend === "supabase") {
    const { data, error } = await sb().auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);
    const profile: Profile = { id: data.user!.id, email, plan: "free", createdAt: new Date().toISOString(), isAdmin: false };
    await sb().from("profiles").insert({ id: profile.id, email, plan: "free", is_admin: false });
    return profile;
  }
  const d = db();
  if (d.emailToId[email]) throw new Error("An account with this email already exists");
  const profile: Profile = {
    id: `usr_${crypto.randomBytes(6).toString("hex")}`,
    email,
    passwordHash: hashPassword(password),
    plan: "free",
    createdAt: new Date().toISOString(),
    isAdmin: false,
  };
  d.profiles[profile.id] = profile;
  d.emailToId[email] = profile.id;
  save(d);
  return profile;
}

export async function login(email: string, password: string): Promise<Profile> {
  email = email.trim().toLowerCase();
  if (backend === "supabase") {
    const { data, error } = await sb().auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new Error("Invalid email or password");
    const { data: row } = await sb().from("profiles").select("*").eq("id", data.user.id).single();
    return {
      id: data.user.id,
      email,
      plan: ((row?.plan as Plan) ?? "free"),
      createdAt: (row?.created_at as string) ?? new Date().toISOString(),
      isAdmin: Boolean(row?.is_admin),
    };
  }
  const d = db();
  const id = d.emailToId[email];
  const profile = id ? d.profiles[id] : undefined;
  if (!profile?.passwordHash || !checkPassword(password, profile.passwordHash)) throw new Error("Invalid email or password");
  return profile;
}

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(24).toString("hex");
  if (backend === "supabase") {
    await sb().from("app_sessions").insert({ token, user_id: userId });
  } else {
    const d = db();
    d.sessions[token] = userId;
    save(d);
  }
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    if (backend === "supabase") await sb().from("app_sessions").delete().eq("token", token);
    else {
      const d = db();
      delete d.sessions[token];
      save(d);
    }
  }
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<Profile | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  if (backend === "supabase") {
    const { data } = await sb().from("app_sessions").select("user_id").eq("token", token).single();
    if (!data) return null;
    const { data: row } = await sb().from("profiles").select("*").eq("id", data.user_id).single();
    if (!row) return null;
    return { id: row.id, email: row.email, plan: row.plan ?? "free", createdAt: row.created_at, isAdmin: Boolean(row.is_admin) };
  }
  const id = db().sessions[token];
  if (!id) return null;
  const profile = db().profiles[id];
  if (!profile) return null;
  const { passwordHash: _hash, ...safe } = profile;
  return safe;
}

// ------------------------------ prefs --------------------------------------

export async function getPreferences(userId: string): Promise<Preferences | null> {
  if (backend === "supabase") {
    const { data } = await sb().from("user_preferences").select("data").eq("user_id", userId).maybeSingle();
    return (data?.data as Preferences) ?? null;
  }
  return db().prefs[userId] ?? null;
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  if (backend === "supabase") {
    const { error } = await sb().from("user_preferences").upsert({ user_id: prefs.userId, data: prefs });
    if (error) throw new Error(error.message);
    return;
  }
  const d = db();
  d.prefs[prefs.userId] = prefs;
  save(d);
}

// ------------------------------ meal plans ---------------------------------

export async function savePlan(plan: MealPlan): Promise<void> {
  if (backend === "supabase") {
    const { error } = await sb().from("meal_plans").upsert({
      id: plan.id,
      user_id: plan.userId,
      title: plan.title,
      days: plan.days,
      people: plan.people,
      budget_amount: plan.budgetAmount,
      currency: plan.currency,
      estimated_total: plan.estimatedTotal,
      budget_remaining: plan.budgetRemaining,
      goal: plan.goal,
      restrictions: plan.restrictions,
      notes: plan.notes,
      status: plan.status,
      created_at: plan.createdAt,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const d = db();
  d.plans[plan.id] = plan;
  save(d);
}

export async function listPlans(userId: string): Promise<MealPlan[]> {
  if (backend === "supabase") {
    const { data } = await sb().from("meal_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id, userId: r.user_id, title: r.title, createdAt: r.created_at, days: r.days,
      people: r.people, budgetAmount: r.budget_amount, currency: r.currency,
      estimatedTotal: r.estimated_total, budgetRemaining: r.budget_remaining,
      goal: r.goal, restrictions: r.restrictions, notes: r.notes, status: r.status,
    }));
  }
  return Object.values(db().plans).filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPlan(userId: string, id: string): Promise<MealPlan | null> {
  if (backend === "supabase") {
    const { data } = await sb().from("meal_plans").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    return data ? {
      id: data.id, userId: data.user_id, title: data.title, createdAt: data.created_at, days: data.days,
      people: data.people, budgetAmount: data.budget_amount, currency: data.currency,
      estimatedTotal: data.estimated_total, budgetRemaining: data.budget_remaining,
      goal: data.goal, restrictions: data.restrictions, notes: data.notes, status: data.status,
    } : null;
  }
  const plan = db().plans[id];
  return plan && plan.userId === userId ? plan : null;
}

export async function deletePlan(userId: string, id: string): Promise<boolean> {
  if (backend === "supabase") {
    const { error } = await sb().from("meal_plans").delete().eq("id", id).eq("user_id", userId);
    return !error;
  }
  const d = db();
  const plan = d.plans[id];
  if (!plan || plan.userId !== userId) return false;
  delete d.plans[id];
  save(d);
  return true;
}

// ------------------------------ grocery lists ------------------------------

export async function saveList(list: GroceryList): Promise<void> {
  if (backend === "supabase") {
    await sb().from("grocery_lists").upsert({
      id: list.id, user_id: list.userId, meal_plan_id: list.mealPlanId, title: list.title,
      currency: list.currency, items: list.items, estimated_total: list.estimatedTotal, created_at: list.createdAt,
    });
    return;
  }
  const d = db();
  d.lists[list.id] = list;
  save(d);
}

export async function listLists(userId: string): Promise<GroceryList[]> {
  if (backend === "supabase") {
    const { data } = await sb().from("grocery_lists").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id, userId: r.user_id, mealPlanId: r.meal_plan_id, title: r.title,
      createdAt: r.created_at, currency: r.currency, items: r.items, estimatedTotal: r.estimated_total,
    }));
  }
  return Object.values(db().lists).filter((l) => l.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getList(userId: string, id: string): Promise<GroceryList | null> {
  if (backend === "supabase") {
    const { data } = await sb().from("grocery_lists").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    return data ? {
      id: data.id, userId: data.user_id, mealPlanId: data.meal_plan_id, title: data.title,
      createdAt: data.created_at, currency: data.currency, items: data.items, estimatedTotal: data.estimated_total,
    } : null;
  }
  const list = db().lists[id];
  return list && list.userId === userId ? list : null;
}

export async function getListForPlan(userId: string, planId: string): Promise<GroceryList | null> {
  const all = await listLists(userId);
  return all.find((l) => l.mealPlanId === planId) ?? null;
}

// ------------------------------ pantry -------------------------------------

export async function listPantry(userId: string): Promise<PantryItem[]> {
  if (backend === "supabase") {
    const { data } = await sb().from("pantry_items").select("*").eq("user_id", userId);
    return (data ?? []).map((r) => ({
      id: r.id, userId: r.user_id, name: r.name, qty: r.qty, unit: r.unit,
      purchaseDate: r.purchase_date ?? undefined, expirationDate: r.expiration_date ?? undefined,
      location: r.location ?? undefined, estimatedCost: r.estimated_cost ?? undefined,
    }));
  }
  return Object.values(db().pantry).filter((p) => p.userId === userId);
}

export async function savePantryItem(item: PantryItem): Promise<void> {
  if (backend === "supabase") {
    await sb().from("pantry_items").upsert({
      id: item.id, user_id: item.userId, name: item.name, qty: item.qty, unit: item.unit,
      purchase_date: item.purchaseDate ?? null, expiration_date: item.expirationDate ?? null,
      location: item.location ?? null, estimated_cost: item.estimatedCost ?? null,
    });
    return;
  }
  const d = db();
  d.pantry[item.id] = item;
  save(d);
}

export async function deletePantryItem(userId: string, id: string): Promise<void> {
  if (backend === "supabase") {
    await sb().from("pantry_items").delete().eq("id", id).eq("user_id", userId);
    return;
  }
  const d = db();
  const item = d.pantry[id];
  if (item && item.userId === userId) {
    delete d.pantry[id];
    save(d);
  }
}

// ------------------------------ conversations ------------------------------

export async function saveConversation(conv: Conversation): Promise<void> {
  if (backend === "supabase") {
    await sb().from("ai_conversations").upsert({ id: conv.id, user_id: conv.userId, title: conv.title, messages: conv.messages, created_at: conv.createdAt });
    return;
  }
  const d = db();
  d.convs[conv.id] = conv;
  save(d);
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  if (backend === "supabase") {
    const { data } = await sb().from("ai_conversations").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({ id: r.id, userId: r.user_id, title: r.title, createdAt: r.created_at, messages: r.messages ?? [] }));
  }
  return Object.values(db().convs).filter((c) => c.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getConversation(userId: string, id: string): Promise<Conversation | null> {
  if (backend === "supabase") {
    const { data } = await sb().from("ai_conversations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    return data ? { id: data.id, userId: data.user_id, title: data.title, createdAt: data.created_at, messages: data.messages ?? [] } : null;
  }
  const conv = db().convs[id];
  return conv && conv.userId === userId ? conv : null;
}

export async function deleteConversation(userId: string, id: string): Promise<void> {
  if (backend === "supabase") {
    await sb().from("ai_conversations").delete().eq("id", id).eq("user_id", userId);
    return;
  }
  const d = db();
  const conv = d.convs[id];
  if (conv && conv.userId === userId) {
    delete d.convs[id];
    save(d);
  }
}

// ------------------------------ usage & favorites ---------------------------

function period(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getUsage(userId: string): Promise<Usage> {
  if (backend === "supabase") {
    const { data } = await sb().from("usage_ledger").select("data").eq("user_id", userId).eq("period", period()).maybeSingle();
    return (data?.data as Usage) ?? { plansGenerated: 0, assistantMessages: 0, period: period() };
  }
  const u = db().usage[userId];
  if (u && u.period === period()) return u;
  return { plansGenerated: 0, assistantMessages: 0, period: period() };
}

export async function bumpUsage(userId: string, field: "plansGenerated" | "assistantMessages"): Promise<void> {
  const usage = await getUsage(userId);
  usage[field] += 1;
  if (backend === "supabase") {
    await sb().from("usage_ledger").upsert({ user_id: userId, period: period(), data: usage });
    return;
  }
  const d = db();
  d.usage[userId] = usage;
  save(d);
}

export async function getFavorites(userId: string): Promise<string[]> {
  if (backend === "supabase") {
    const { data } = await sb().from("favorite_recipes").select("recipe_id").eq("user_id", userId);
    return (data ?? []).map((r) => r.recipe_id);
  }
  return db().favorites[userId] ?? [];
}

export async function toggleFavorite(userId: string, recipeId: string): Promise<boolean> {
  if (backend === "supabase") {
    const { data } = await sb().from("favorite_recipes").select("recipe_id").eq("user_id", userId).eq("recipe_id", recipeId).maybeSingle();
    if (data) {
      await sb().from("favorite_recipes").delete().eq("user_id", userId).eq("recipe_id", recipeId);
      return false;
    }
    await sb().from("favorite_recipes").insert({ user_id: userId, recipe_id: recipeId });
    return true;
  }
  const d = db();
  const favs = d.favorites[userId] ?? [];
  const has = favs.includes(recipeId);
  d.favorites[userId] = has ? favs.filter((f) => f !== recipeId) : [...favs, recipeId];
  save(d);
  return !has;
}

export function logAgentRun(run: { userId?: string; agent: string; action: string; status: "ok" | "error" | "fallback"; detail?: string; ms?: number }) {
  try {
    if (backend === "supabase") {
      void sb().from("ai_agent_runs").insert({
        user_id: run.userId ?? null, agent: run.agent, action: run.action, status: run.status, detail: run.detail ?? null, duration_ms: run.ms ?? null,
      });
    } else {
      const d = db();
      d.agentRuns.push({ ...run, at: new Date().toISOString() });
      if (d.agentRuns.length > 1000) d.agentRuns = d.agentRuns.slice(-500);
      save(d);
    }
  } catch {
    // never break the request path
  }
}
