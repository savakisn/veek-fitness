import { NextResponse } from "next/server";
import { syncGarmin } from "@/lib/garmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily Vercel cron hits this. Protected by CRON_SECRET (Vercel sends it as a
// Bearer token); if CRON_SECRET is unset the route is open (local dev).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
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
