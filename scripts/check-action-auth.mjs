// Fails when a Server Action skips the auth check. Actions are reachable by direct
// POST from any route that imports them, including /login (outside the proxy), so
// every exported function in a "use server" file must call getCurrentUser().
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const EXEMPT = new Set(["login", "logout"]); // signing in and out need no session

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}

const missing = [];
for (const dir of ["app", "lib", "components"]) {
  for (const file of files(dir)) {
    const src = readFileSync(file, "utf8");
    if (!/^\s*["']use server["']/.test(src)) continue;
    const parts = src.split(/(?=^export async function )/m).slice(1);
    for (const part of parts) {
      const name = part.match(/^export async function (\w+)/)[1];
      if (!EXEMPT.has(name) && !/await getCurrentUser\(\)/.test(part)) missing.push(`${file}: ${name}`);
    }
  }
}

if (missing.length) {
  console.error("Server actions without an auth check (call `await getCurrentUser()`):\n  " + missing.join("\n  "));
  process.exit(1);
}
console.log("Action auth check: every server action calls getCurrentUser().");
