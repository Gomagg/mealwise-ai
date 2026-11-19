"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Leaf } from "lucide-react";
import { signInAction } from "../actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3">
      {pending ? "Signing in…" : label}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(signInAction, { error: "" } as { error?: string });

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-700 text-white"><Leaf size={20} /></span>
          <span className="text-base font-bold tracking-tight text-forest-950">MEALWISE AI</span>
        </Link>
        <div className="card p-7">
          <h1 className="text-xl font-bold tracking-tight text-forest-950">Welcome back</h1>
          <p className="muted mt-1">Log in to your meal plans and grocery lists.</p>
          <form action={action} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} className="input" placeholder="••••••••" />
            </div>
            {state?.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
            <Submit label="Log in" />
          </form>
          <p className="mt-5 text-center text-sm text-forest-600">
            New here? <Link href="/signup" className="font-semibold text-forest-800 hover:underline">Create an account</Link>
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-forest-500">
          Password recovery requires configured email delivery. Set RESEND_API_KEY to enable it.
        </p>
      </div>
    </div>
  );
}
