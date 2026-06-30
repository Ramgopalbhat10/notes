import type { NextConfig } from "next";

const cacheComponents = process.env.NEXT_CACHE_COMPONENTS !== "false";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the repo root explicitly so Turbopack does not walk up to unrelated lockfiles.
    root: process.cwd(),
    // Enable future Turbopack options here (e.g., resolveAlias, filesystem cache)
  },
  // partialPrefetching requires cacheComponents (Next.js validates this at build time).
  // Derive both from the same env guard so the NEXT_CACHE_COMPONENTS=false rollback
  // path disables them together instead of leaving an invalid combination.
  cacheComponents,
  partialPrefetching: cacheComponents,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
    minimumCacheTTL: 60 * 60 * 4, // 4 hours (Next 16 default)
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
};

export default nextConfig;
