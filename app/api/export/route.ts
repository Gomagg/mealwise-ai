import { NextResponse } from "next/server";
import { currentUser, getPreferences, listPlans, listLists, listPantry, listConversations, getFavorites } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [preferences, mealPlans, groceryLists, pantry, conversations, favorites] = await Promise.all([
    getPreferences(user.id),
    listPlans(user.id),
    listLists(user.id),
    listPantry(user.id),
    listConversations(user.id),
    getFavorites(user.id),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    note: "Nutrition and grocery prices in this export are estimates, not verified data.",
    account: { email: user.email, plan: user.plan, createdAt: user.createdAt },
    preferences,
    mealPlans,
    groceryLists,
    pantry,
    conversations,
    favoriteRecipes: favorites,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="mealwise-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
