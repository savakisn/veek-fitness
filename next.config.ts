import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM and garmin-connect uses Node internals; keep both unbundled.
  serverExternalPackages: ["@electric-sql/pglite", "garmin-connect"],
};

export default nextConfig;
