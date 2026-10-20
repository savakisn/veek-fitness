import "server-only";

// In-memory failed-login limiter. This is a speed bump, not a guarantee: on Vercel
// each serverless instance has its own memory and cold starts reset it, so a patient
// attacker spread across instances gets more tries than the numbers below suggest.
// Real protection needs a shared store (and long/hashed passcodes), which needs a
// schema or infra change. See SECURITY.md.

const WINDOW_MS = 15 * 60 * 1000;
const PER_IP_MAX = 5;
const GLOBAL_MAX = 30;
const MAX_KEYS = 5000;

const failures = new Map<string, number[]>();
const GLOBAL = "*global*";

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export function isLockedOut(ip: string): boolean {
  const now = Date.now();
  return recent(ip, now).length >= PER_IP_MAX || recent(GLOBAL, now).length >= GLOBAL_MAX;
}

export function recordFailure(ip: string): void {
  const now = Date.now();
  if (failures.size > MAX_KEYS) failures.clear(); // bound memory under a spoofed-IP flood
  for (const key of [ip, GLOBAL]) failures.set(key, [...recent(key, now), now]);
}

export function clearFailures(ip: string): void {
  failures.delete(ip);
}
