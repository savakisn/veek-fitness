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

export async function signToken(userId: number, secret: string): Promise<string> {
  const payload = String(userId);
  const sig = await crypto.subtle.sign("HMAC", await key(secret, "sign"), new TextEncoder().encode(payload));
  return `${payload}.${toB64url(sig)}`;
}

// crypto.subtle.verify compares in constant time, unlike a string ===.
export async function verifyToken(token: string | undefined, secret: string): Promise<number | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  if (!/^\d+$/.test(payload)) return null;
  const sig = fromB64url(token.slice(dot + 1));
  if (!sig) return null;
  const ok = await crypto.subtle.verify("HMAC", await key(secret, "verify"), sig, new TextEncoder().encode(payload));
  return ok ? Number.parseInt(payload, 10) : null;
}
