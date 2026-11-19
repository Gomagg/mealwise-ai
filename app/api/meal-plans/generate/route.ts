import { NextResponse } from "next/server";
import { requireUser, badRequest, readJson } from "@/lib/api-auth";
import { getPreferences, getUsage } from "@/lib/store";
import { generateMealPlan } from "@/lib/assistant";
import { canGeneratePlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = await readJson<{ prompt?: string }>(req);
  const prompt = (body?.prompt ?? "").trim();
  if (prompt.length < 10) return badRequest("Describe your budget, days, people and any dietary needs (at least 10 characters).");

  const [prefs, usage] = await Promise.all([getPreferences(auth.user.id), getUsage(auth.user.id)]);
  const people = prefs?.household.peopleFed ?? 1;
  const blocked = canGeneratePlan(auth.user.plan, usage, people);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 429 });

  const result = await generateMealPlan(auth.user, prefs, prompt);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json(
    { plan: result.plan, groceryList: result.list, explanation: result.explanation },
    { status: 201 }
  );
}
