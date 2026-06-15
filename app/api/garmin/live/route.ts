import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-token";
import { fetchLiveMetrics } from "@/lib/garmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called from the app on open to refresh today's body battery / steps / resting HR.
// Gated to a logged-in user so it isn't a public Garmin-login trigger.
export async function POST() {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    const userId = await verifyToken((await cookies()).get("vf_user")?.value, secret);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const res = await fetchLiveMetrics();
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "live fetch failed" },
      { status: 500 },
    );
  }
}
