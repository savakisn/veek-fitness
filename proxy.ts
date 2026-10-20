import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenFull, signToken, needsRefresh, sessionCookie } from "@/lib/auth-token";

// Multi-user gate. The vf_user cookie is an HMAC-signed user id, verified here on
// the edge. With AUTH_SECRET unset the gate is open in dev and closed in production.
// Server Actions re-check auth themselves (see lib/auth.ts), since /login is skipped.
export async function proxy(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return new NextResponse("Server misconfigured", { status: 503 });
    return NextResponse.next();
  }
  const session = await verifyTokenFull(req.cookies.get(sessionCookie.name)?.value, secret);
  if (session) {
    const res = NextResponse.next();
    // Sliding refresh; also upgrades pre-expiry legacy tokens without signing anyone out.
    if (needsRefresh(session)) {
      res.cookies.set(sessionCookie.name, await signToken(session.userId, secret), sessionCookie.options());
    }
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api|_next|manifest.webmanifest|sw.js|icons|favicon.ico).*)"],
};
