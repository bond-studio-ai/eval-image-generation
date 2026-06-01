import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // During the coverage E2E run (COVERAGE_RAW=1) the app is served by `next dev`
  // so V8 coverage has resolvable source maps. Hide the dev indicator there so
  // it can't introduce spurious nodes into the a11y scan. No effect on normal
  // `next dev` / `next start`.
  ...(process.env.COVERAGE_RAW ? { devIndicators: false as const } : {})
};

export default nextConfig;
