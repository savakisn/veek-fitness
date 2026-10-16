import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./db/schema";
import type { User } from "./db/schema";
import { verifyToken } from "./auth-token";

// The signed-in user for this request. Every Server Action must call this: actions
// are reachable by direct POST on any route that imports them (including /login,
// which the proxy skips), so the proxy alone doesn't protect them.
// With AUTH_SECRET set, a missing or bad cookie redirects to /login. In dev (no
// secret) it honours a plain cookie id or defaults to the first user. In production
// a missing secret fails closed. Cached per request.
export const getCurrentUser = cache(async (): Promise<User> => {
  const db = await getDb();
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get("vf_user")?.value;

  if (secret) {
    const userId = await verifyToken(token, secret);
    if (userId) {
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (u) return u;
    }
    redirect("/login");
  }

  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set.");

  if (token && /^\d+$/.test(token)) {
    const [u] = await db.select().from(users).where(eq(users.id, Number.parseInt(token, 10)));
    if (u) return u;
  }
  const [first] = await db.select().from(users).orderBy(users.id).limit(1);
  return first;
});
