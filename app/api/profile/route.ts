import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getPreferences } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const prefs = await getPreferences(auth.user.id);
  if (!prefs) return NextResponse.json({ error: "Complete onboarding first." }, { status: 409 });
  return NextResponse.json({
    profile: auth.user,
    preferences: prefs,
    estimates: "Nutrition and price figures are planning estimates, not verified data.",
  });
}
