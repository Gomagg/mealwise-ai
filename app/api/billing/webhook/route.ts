import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Webhook stub. Refuses to process anything until a provider secret is present
// and a signature is verified, so a stray request can never upgrade an account.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "No webhook secret configured. Billing events are not accepted." },
      { status: 501 }
    );
  }
  const signature = req.headers.get("stripe-signature") ?? req.headers.get("x-paystack-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }
  return NextResponse.json(
    { error: "Webhook signature verification is not implemented in this build." },
    { status: 501 }
  );
}
