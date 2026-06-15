"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signToken } from "@/lib/auth-token";

export async function login(formData: FormData) {
  const code = String(formData.get("passcode") ?? "").trim();
  if (!code) redirect("/login?error=1");

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.passcode, code));
  if (!user) redirect("/login?error=1");

  const secret = process.env.AUTH_SECRET;
  const value = secret ? await signToken(user.id, secret) : String(user.id);
  (await cookies()).set("vf_user", value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}
