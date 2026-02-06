import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Enable future Turbopack options here (e.g., resolveAlias, filesystem cache)
  },
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
    minimumCacheTTL: 60 * 60 * 4, // 4 hours (Next 16 default)
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
};

export default nextConfig;
