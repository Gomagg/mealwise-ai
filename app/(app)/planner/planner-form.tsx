"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Sparkles, Info } from "lucide-react";
import { generatePlanAction } from "../../actions";

const EXAMPLES = [
  "I have ₦35,000 for food this week. I want affordable Nigerian meals, high protein, and meals that take less than 30 minutes to prepare. Plan breakfast, lunch and dinner for one person.",
  "Create a seven-day family meal plan for four people. We eat chicken, fish, rice, beans and vegetables. Avoid expensive ingredients and include child-friendly meals.",
  "I'm trying to build muscle. Give me a seven-day meal plan with sufficient protein and a grocery list.",
  "I have $60 this week for two people. Vegetarian meals only, quick to cook, with a grocery list.",
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3">
      {pending ? "Building your plan…" : "Generate my meal plan"}
    </button>
  );
}

export function PlannerForm({ defaultPrompt }: { defaultPrompt?: string }) {
  const [state, action] = useFormState(generatePlanAction, { error: "" } as { error?: string });

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form action={action} className="card space-y-4 p-5 lg:col-span-3">
        <div>
          <label htmlFor="prompt" className="label">Describe what you need</label>
          <textarea
            id="prompt"
            name="prompt"
            rows={6}
            required
            className="input resize-y"
            placeholder={EXAMPLES[0]}
            defaultValue={defaultPrompt}
          />
          <p className="mt-2 text-xs text-forest-500">
            Include your budget, how many days, how many people and any dietary needs. The planner fills in the rest from your profile.
          </p>
        </div>
        {state?.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
        <Submit />
        <p className="flex items-start gap-2 rounded-xl bg-forest-50 px-3 py-2 text-xs leading-relaxed text-forest-600">
          <Info size={14} className="mt-0.5 shrink-0" />
          Costs and nutrition totals are calculated by the server, not the AI. Prices are labelled estimates you can override.
        </p>
      </form>

      <div className="space-y-3 lg:col-span-2">
        <p className="text-sm font-semibold text-forest-950">Try an example</p>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              const el = document.getElementById("prompt") as HTMLTextAreaElement | null;
              if (el) { el.value = ex; el.focus(); }
            }}
            className="card w-full p-3 text-left text-xs leading-relaxed text-forest-700 transition hover:border-forest-300"
          >
            <Sparkles size={13} className="mb-1 text-forest-400" />
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
