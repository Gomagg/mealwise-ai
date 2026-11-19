import { NextResponse } from "next/server";
import { requireUser, badRequest, readJson } from "@/lib/api-auth";
import { deletePantryItem, listPantry, savePantryItem } from "@/lib/store";
import type { PantryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  return NextResponse.json({ items: await listPantry(auth.user.id) });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = await readJson<Partial<PantryItem>>(req);
  const name = (body?.name ?? "").trim().toLowerCase();
  if (!name) return badRequest("A pantry item needs a name.");

  const item: PantryItem = {
    id: `pi_${Math.random().toString(36).slice(2, 10)}`,
    userId: auth.user.id,
    name,
    qty: Number(body?.qty) > 0 ? Number(body?.qty) : 1,
    unit: body?.unit || "piece",
    purchaseDate: body?.purchaseDate || undefined,
    expirationDate: body?.expirationDate || undefined,
    location: body?.location || undefined,
    estimatedCost: Number(body?.estimatedCost) > 0 ? Number(body?.estimatedCost) : undefined,
  };
  await savePantryItem(item);
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Provide ?id= of the pantry item to delete.");
  await deletePantryItem(auth.user.id, id);
  return NextResponse.json({ ok: true });
}
