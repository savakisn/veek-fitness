"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const code = String(formData.get("passcode") ?? "");
  const passcode = process.env.PASSCODE;

  if (passcode && code === passcode) {
    (await cookies()).set("vf_auth", code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    redirect("/");
  }
  redirect("/login?error=1");
}
