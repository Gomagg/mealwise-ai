import { NextResponse } from "next/server";
import { requireUser, badRequest, readJson } from "@/lib/api-auth";
import { getPreferences, getUsage } from "@/lib/store";
import { chatWithAssistant } from "@/lib/assistant";
import { canMessage } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = await readJson<{ message?: string; conversationId?: string }>(req);
  const message = (body?.message ?? "").trim();
  if (!message) return badRequest("Type a message first.");

  const [prefs, usage] = await Promise.all([getPreferences(auth.user.id), getUsage(auth.user.id)]);
  const blocked = canMessage(auth.user.plan, usage);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 429 });

  const result = await chatWithAssistant(auth.user, prefs, message, body?.conversationId || undefined);
  return NextResponse.json({
    reply: result.reply,
    conversationId: result.conversationId,
    mode: result.mode,
    disclaimer: "Food-planning guidance only — not medical advice.",
  });
}
