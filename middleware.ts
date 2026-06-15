import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-token";

// Multi-user gate. Set AUTH_SECRET in prod; if it's unset (local dev) the gate is
// open. The vf_user cookie is an HMAC-signed user id, verified here on the edge.
export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.next();
  const userId = await verifyToken(req.cookies.get("vf_user")?.value, secret);
  if (userId) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api|_next|manifest.webmanifest|sw.js|icons|favicon.ico).*)"],
};
