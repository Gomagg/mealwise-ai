"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { chatAction } from "../../actions";
import { Send, Loader2 } from "lucide-react";

export function ChatBox({ conversationId }: { conversationId?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div>
      <form
        ref={formRef}
        action={async (formData) => {
          setPending(true);
          setError(null);
          const res = await chatAction(null, formData);
          setPending(false);
          if (res?.error) setError(res.error);
          else {
            formRef.current?.reset();
            router.refresh();
          }
        }}
        className="flex items-end gap-2"
      >
        <input type="hidden" name="conversationId" value={conversationId ?? ""} />
        <textarea
          name="message"
          rows={2}
          required
          placeholder="e.g. What can I cook with ₦2,000 today? Or: replace a meal with something cheaper."
          className="input resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <button type="submit" disabled={pending} className="btn-primary h-11 w-11 shrink-0 p-0" aria-label="Send message">
          {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
      {error ? <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <p className="mt-2 text-[11px] text-forest-400">
        The assistant gives planning help only, never medical advice. It won’t change prices, budgets or your plan without you.
      </p>
    </div>
  );
}
