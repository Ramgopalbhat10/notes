import type { MetadataRoute } from "next";

import { siteMetadata } from "@/lib/site-metadata";

const THEME_COLOR = "#09090b";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteMetadata.product,
    short_name: siteMetadata.shortName,
    description: siteMetadata.description,
    start_url: "/files",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-192x192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
