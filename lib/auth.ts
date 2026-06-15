import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./db/schema";
import type { User } from "./db/schema";
import { verifyToken } from "./auth-token";

// The signed-in user for this request. With AUTH_SECRET set, reads the verified
// cookie; in dev (no secret) it honours a plain cookie id or defaults to the
// first user so there's always someone to be. Cached per request.
export const getCurrentUser = cache(async (): Promise<User> => {
  const db = await getDb();
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get("vf_user")?.value;

  let userId: number | null = null;
  if (secret) userId = await verifyToken(token, secret);
  else if (token && /^\d+$/.test(token)) userId = Number.parseInt(token, 10);

  if (userId) {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (u) return u;
  }
  const [first] = await db.select().from(users).orderBy(users.id).limit(1);
  return first;
});
