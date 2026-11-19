import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, getPreferences, listConversations, getUsage } from "@/lib/store";
import { ChatBox } from "./chat-box";
import { Card, Badge } from "@/components/ui";
import { deleteConversationAction } from "../../actions";
import { PLANS } from "@/lib/plans";
import { aiConfigured } from "@/lib/ai-config";

export default async function AssistantPage({ searchParams }: { searchParams: { c?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  if (!prefs) redirect("/onboarding");
  const conversations = await listConversations(user.id);
  const active = searchParams.c ? conversations.find((c) => c.id === searchParams.c) ?? conversations[0] : conversations[0];
  const usage = await getUsage(user.id);
  const aiOn = aiConfigured();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-forest-950">AI Food Assistant</h1>
          <p className="muted mt-1">
            Ask about meals, budgets or your pantry. {aiOn ? "AI provider connected." : "Running on the built-in rule-based assistant — add an AI key for richer conversation."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={aiOn ? "green" : "gray"}>{aiOn ? "AI connected" : "Rule-based mode"}</Badge>
          <Link href="/assistant" className="btn-secondary">New conversation</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">Conversations</p>
          {conversations.length === 0 ? (
            <p className="text-xs text-forest-500">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div key={c.id} className={`flex items-center gap-1 rounded-xl border px-3 py-2 ${active?.id === c.id ? "border-forest-400 bg-white" : "border-transparent hover:bg-white"}`}>
                <Link href={`/assistant?c=${c.id}`} className="min-w-0 flex-1 truncate text-xs text-forest-700">{c.title}</Link>
                <form action={deleteConversationAction}>
                  <input type="hidden" name="conversationId" value={c.id} />
                  <button className="text-[11px] text-forest-400 hover:text-red-600" aria-label="Delete conversation">✕</button>
                </form>
              </div>
            ))
          )}
          <p className="pt-2 text-[11px] text-forest-400">{usage.assistantMessages} of {PLANS[user.plan].limits.assistantMessages} messages used this month.</p>
        </div>

        <Card className="lg:col-span-3">
          <div className="min-h-[320px] space-y-4">
            {!active || active.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft text-2xl">💬</div>
                <p className="mt-3 text-sm font-semibold text-forest-900">Ask me anything about your food week</p>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-forest-500">
                  “What can I cook with ₦2,000 today?” · “Give me affordable high-protein meals” · “What should I eat for breakfast tomorrow?” ·
                  “What can I cook with the ingredients in my pantry?”
                </p>
              </div>
            ) : (
              active.messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-900"}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 border-t border-forest-100 pt-4">
            <ChatBox conversationId={active?.id} />
          </div>
        </Card>
      </div>
    </div>
  );
}
