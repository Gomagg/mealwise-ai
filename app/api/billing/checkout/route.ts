import { NextResponse } from "next/server";
import { requireUser, readJson } from "@/lib/api-auth";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

// Payment adapters are intentionally configuration-gated. Without provider
// credentials this endpoint never fabricates a checkout session or an upgrade.
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = await readJson<{ plan?: string }>(req);
  const plan = body?.plan as Plan | undefined;
  if (!plan || !(plan in PLANS) || plan === "free") {
    return NextResponse.json({ error: "Choose a paid plan: smart or family_pro." }, { status: 400 });
  }

  const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const hasPaystack = Boolean(process.env.PAYSTACK_SECRET_KEY);
  const hasFlutterwave = Boolean(process.env.FLUTTERWAVE_SECRET_KEY);

  if (!hasStripe && !hasPaystack && !hasFlutterwave) {
    return NextResponse.json(
      {
        error: "Billing is not connected in this environment.",
        detail:
          "Set STRIPE_SECRET_KEY, PAYSTACK_SECRET_KEY or FLUTTERWAVE_SECRET_KEY (see .env.example) to enable checkout. No payment was taken and no plan was changed.",
        plan,
        priceUSD: PLANS[plan].priceUSD,
      },
      { status: 501 }
    );
  }

  // Integration point: create a provider checkout session here and return its URL.
  return NextResponse.json(
    {
      error: "Billing credentials detected, but the live checkout adapter is not enabled in this build.",
      detail: "Wire the provider SDK in app/api/billing/checkout/route.ts and handle the webhook before accepting payments.",
      plan,
    },
    { status: 501 }
  );
}
