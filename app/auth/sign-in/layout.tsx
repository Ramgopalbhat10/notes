import type { Metadata } from "next";
import type { ReactNode } from "react";

import { absoluteUrl, siteMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Authenticate with GitHub to open your Markdown Vault workspace.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign in",
    description: "Authenticate with GitHub to open your Markdown Vault workspace.",
    url: absoluteUrl("/auth/sign-in"),
    siteName: siteMetadata.product,
  },
};

export default function SignInLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
