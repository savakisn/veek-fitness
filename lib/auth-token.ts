// HMAC-signed login token, shared by the edge middleware and server code.
// Uses Web Crypto + btoa so it runs in both the edge and Node runtimes.

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  let bin = "";
  const arr = new Uint8Array(sig);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signToken(userId: number, secret: string): Promise<string> {
  const payload = String(userId);
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifyToken(token: string | undefined, secret: string): Promise<number | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sig !== (await hmac(secret, payload))) return null;
  const id = Number.parseInt(payload, 10);
  return Number.isInteger(id) ? id : null;
}
