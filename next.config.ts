import type { NextConfig } from "next";

const cacheComponents = process.env.NEXT_CACHE_COMPONENTS !== "false";

const nextConfig: NextConfig = {
  // @libsql/client is on Next's default serverExternalPackages list. Turbopack
  // rewrites it to a hashed alias (@libsql/client-<hash>) that often fails to
  // resolve in Vercel serverless artifacts. transpilePackages forces bundling
  // and overrides that default externalization for this package.
  transpilePackages: ["@libsql/client"],
  turbopack: {
    // Pin the repo root explicitly so Turbopack does not walk up to unrelated lockfiles.
    root: process.cwd(),
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
