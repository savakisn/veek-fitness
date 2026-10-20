// HMAC-signed login token, shared by the edge proxy and server code.
// Uses Web Crypto + btoa so it runs in both the edge and Node runtimes.

function key(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

function toB64url(buf: ArrayBuffer): string {
  let bin = "";
  const arr = new Uint8Array(buf);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

// Cookie lifetime and sliding refresh. Tokens carry their own expiry so a stolen
// cookie stops working server-side, not just in the browser.
export const SESSION_DAYS = 90;
export const SESSION_MAX_AGE = 60 * 60 * 24 * SESSION_DAYS;
export const REFRESH_WHEN_UNDER_DAYS = 60;

export const sessionCookie = {
  name: "vf_user",
  options: (): {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
  } => ({
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  }),
};

// New tokens are `<id>.<expSeconds>.<sig>`. Legacy `<id>.<sig>` tokens (issued before
// expiry existed) still verify so nobody is signed out at deploy; the proxy upgrades
// them to the expiring format on their next request.
export async function signToken(userId: number, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}.${exp}`;
  const sig = await crypto.subtle.sign("HMAC", await key(secret, "sign"), new TextEncoder().encode(payload));
  return `${payload}.${toB64url(sig)}`;
}

export type VerifiedToken = { userId: number; exp: number | null };

// crypto.subtle.verify compares in constant time, unlike a string ===.
export async function verifyTokenFull(token: string | undefined, secret: string): Promise<VerifiedToken | null> {
  if (!token || token.length > 200) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const m = /^(\d{1,9})(?:\.(\d{1,12}))?$/.exec(payload);
  if (!m) return null;
  const sig = fromB64url(token.slice(dot + 1));
  if (!sig) return null;
  const ok = await crypto.subtle.verify("HMAC", await key(secret, "verify"), sig, new TextEncoder().encode(payload));
  if (!ok) return null;
  const exp = m[2] ? Number.parseInt(m[2], 10) : null;
  if (exp !== null && exp * 1000 < Date.now()) return null;
  return { userId: Number.parseInt(m[1], 10), exp };
}

export async function verifyToken(token: string | undefined, secret: string): Promise<number | null> {
  return (await verifyTokenFull(token, secret))?.userId ?? null;
}

// True when a verified token should be reissued (legacy, or under the refresh window).
export function needsRefresh(t: VerifiedToken): boolean {
  if (t.exp === null) return true;
  return t.exp - Date.now() / 1000 < REFRESH_WHEN_UNDER_DAYS * 86400;
}
