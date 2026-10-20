import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { syncGarmin } from "@/lib/garmin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// The daily Vercel cron hits GET with the CRON_SECRET bearer. The app's "Sync
// now" button hits POST as a logged-in user. Either path triggers a full sync.
function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return true;
  const authSecret = process.env.AUTH_SECRET;
  if (authSecret) {
    const userId = await verifyToken((await cookies()).get("vf_user")?.value, authSecret);
    if (userId) return true;
  }
  // No secrets configured at all → open in local dev only.
  return !secret && !authSecret && process.env.NODE_ENV !== "production";
}

async function run(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncGarmin();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "sync failed" },
      { status: 500 },
    );
  }
}

export const GET = run;
export const POST = run;
