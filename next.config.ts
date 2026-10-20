import type { NextConfig } from "next";

// No script-src CSP: Next injects inline bootstrap scripts and the PWA service worker
// would need nonce plumbing; a half-working script CSP is worse than none. This
// subset blocks framing, plugins, base-tag and form-target tricks without touching scripts.
const csp = ["frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // PGlite ships WASM and garmin-connect uses Node internals; keep both unbundled.
  serverExternalPackages: ["@electric-sql/pglite", "garmin-connect"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
