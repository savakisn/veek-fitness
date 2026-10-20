"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signToken, sessionCookie } from "@/lib/auth-token";
import { isLockedOut, recordFailure, clearFailures } from "@/lib/rate-limit";

const MIN_FAIL_DELAY_MS = 800;

const sha = (s: string) => createHash("sha256").update(s).digest();

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// The login form is public by design: it is the one action that cannot require a
// session. Hardened with a failed-attempt limiter, constant-time comparison and a
// minimum delay on failure.
export async function login(formData: FormData) {
  const ip = await clientIp();
  if (isLockedOut(ip)) redirect("/login?error=locked");

  const raw = formData.get("passcode");
  const code = typeof raw === "string" ? raw.trim().slice(0, 128) : "";

  const db = await getDb();
  const all = await db.select().from(users);
  // Compare against every user without early exit so timing doesn't reveal a match.
  const codeHash = sha(code);
  let match: (typeof all)[number] | undefined;
  for (const u of all) {
    if (u.passcode && timingSafeEqual(sha(u.passcode), codeHash)) match = u;
  }

  if (!code || !match) {
    recordFailure(ip);
    await new Promise((r) => setTimeout(r, MIN_FAIL_DELAY_MS));
    redirect("/login?error=1");
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set.");
  const value = secret ? await signToken(match.id, secret) : String(match.id);
  clearFailures(ip);
  (await cookies()).set(sessionCookie.name, value, sessionCookie.options());
  redirect("/");
}
