import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { syncGarmin } from "@/lib/garmin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// The daily Vercel cron hits GET with the CRON_SECRET bearer. The app's "Sync
// now" button hits POST as a logged-in user. Either path triggers a full sync.
async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  const authSecret = process.env.AUTH_SECRET;
  if (authSecret) {
    const userId = await verifyToken((await cookies()).get("vf_user")?.value, authSecret);
    if (userId) return true;
  }
  // No secrets configured at all (local dev) → open.
  return !secret && !authSecret;
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
