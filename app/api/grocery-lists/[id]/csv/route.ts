import { NextResponse } from "next/server";
import { currentUser, getList } from "@/lib/store";
import { groceryCsv } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const list = await getList(user.id, params.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const csv = groceryCsv(list);
  const safeTitle = list.title.replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase();
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safeTitle || "grocery-list"}.csv"`,
      "cache-control": "no-store",
    },
  });
}
