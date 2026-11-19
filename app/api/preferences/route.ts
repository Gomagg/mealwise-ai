import { NextResponse } from "next/server";
import { requireUser, readJson } from "@/lib/api-auth";
import { getPreferences, savePreferences } from "@/lib/store";
import type { Preferences } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const prefs = await getPreferences(auth.user.id);
  return NextResponse.json({ profile: auth.user, preferences: prefs });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const existing = await getPreferences(auth.user.id);
  if (!existing) return NextResponse.json({ error: "Complete onboarding first." }, { status: 409 });

  const patch = await readJson<Partial<Preferences>>(req);
  if (!patch) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  // Only user-editable fields are accepted; identity fields stay server-owned.
  const allowed: (keyof Preferences)[] = [
    "displayName", "country", "city", "language", "currency", "timezone",
    "household", "favoriteFoods", "dislikedFoods", "preferredCuisines", "refusedFoods",
    "dietary", "allergies", "goal", "activity", "cookingFreq", "maxCookMinutes",
    "mealsPerDay", "budget",
  ];
  const updated = { ...existing, userId: auth.user.id, onboarded: true } as Preferences;
  const mutable = updated as unknown as Record<string, unknown>;
  const source = patch as Record<string, unknown>;
  for (const key of allowed) {
    if (source[key] !== undefined) mutable[key] = source[key];
  }
  if (updated.budget) updated.budget.currency = updated.currency;
  await savePreferences(updated);
  return NextResponse.json({ preferences: updated });
}
