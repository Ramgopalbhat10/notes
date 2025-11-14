import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { siteMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Home",
  description: "Redirecting to your Markdown Vault workspace.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: siteMetadata.baseUrl,
  },
};

export default function Home() {
  redirect("/files");
}
