import type { Metadata } from "next";
import type { ReactNode } from "react";

import { absoluteUrl, siteMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Access denied",
  description: "Your GitHub account is not authorized for this Markdown Vault.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/auth/error",
  },
  openGraph: {
    title: "Access denied",
    description: "Your GitHub account is not authorized for this Markdown Vault.",
    url: absoluteUrl("/auth/error"),
    siteName: siteMetadata.product,
  },
};

export default function AuthErrorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
