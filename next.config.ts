import type { NextConfig } from "next";

// During the coverage run (COVERAGE_RAW=1) the app is served by a production
// `next start` build, and we need source maps for both layers so V8 coverage
// maps back to `src/**`: client chunks via `productionBrowserSourceMaps`, and
// server bundles via `experimental.serverSourceMaps`. These are gated on the
// flag so normal builds (verify, Vercel) aren't slowed or enlarged.
const coverage = Boolean(process.env.COVERAGE_RAW);

const nextConfig: NextConfig = coverage
  ? {
      productionBrowserSourceMaps: true,
      experimental: { serverSourceMaps: true }
    }
  : {};

export default nextConfig;
