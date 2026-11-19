"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Leaf } from "lucide-react";
import { signUpAction } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3">
      {pending ? "Creating account…" : "Create my account"}
    </button>
  );
}

export default function SignupPage() {
  const [state, action] = useFormState(signUpAction, { error: "" } as { error?: string });

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-700 text-white"><Leaf size={20} /></span>
          <span className="text-base font-bold tracking-tight text-forest-950">MEALWISE AI</span>
        </Link>
        <div className="card p-7">
          <h1 className="text-xl font-bold tracking-tight text-forest-950">Start eating smarter</h1>
          <p className="muted mt-1">Free to start. Build your first seven-day plan today.</p>
          <form action={action} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="At least 8 characters" />
            </div>
            {state?.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
            <Submit />
          </form>
          <p className="mt-4 text-center text-xs leading-relaxed text-forest-500">
            By creating an account you agree that MEALWISE AI provides general food-planning information only,
            not medical advice. Dietary and allergy data is sensitive — you control it in Settings.
          </p>
          <p className="mt-4 text-center text-sm text-forest-600">
            Already have an account? <Link href="/login" className="font-semibold text-forest-800 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
