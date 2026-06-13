import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Single-user gate. Set PASSCODE in env for production; if it's unset (local dev)
// the gate is open so there's nothing to log into. The cookie holds the passcode
// itself, httpOnly, so it can't be forged without knowing it.
export function middleware(req: NextRequest) {
  const passcode = process.env.PASSCODE;
  if (!passcode) return NextResponse.next();
  if (req.cookies.get("vf_auth")?.value === passcode) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next|manifest.webmanifest|sw.js|icons|favicon.ico).*)"],
};
