import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { fetchBodyBatteryToday } from "@/lib/garmin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Today's intraday body battery curve, fetched on demand so the deep-dive page
// navigates instantly instead of blocking on a live Garmin call.
export async function GET() {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    const userId = await verifyToken((await cookies()).get("vf_user")?.value, secret);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const samples = await fetchBodyBatteryToday();
    return NextResponse.json({ ok: true, samples });
  } catch {
    return NextResponse.json({ ok: false, samples: [] });
  }
}
