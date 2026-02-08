import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Enable future Turbopack options here (e.g., resolveAlias, filesystem cache)
  },
  cacheComponents: process.env.NEXT_CACHE_COMPONENTS !== "false",
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
