import { NextResponse } from "next/server";
import type { Profile } from "./types";
import { currentUser } from "./store";

/** Shared guard for JSON API routes. */
export async function requireUser(): Promise<{ user: Profile; response?: never } | { user?: never; response: NextResponse }> {
  const user = await currentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorised. Sign in first." }, { status: 401 }) };
  }
  return { user };
}

export function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
