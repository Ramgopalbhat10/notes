import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  absoluteUrl,
  decodePathSegments,
  filesCanonicalPath,
  workspaceDescription,
  workspaceTitle,
} from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const relativePath = decodePathSegments(resolvedParams.path);
  const title = workspaceTitle(relativePath);
  const description = workspaceDescription(relativePath);
  const canonical = filesCanonicalPath(relativePath);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: "article",
    },
    twitter: {
      title,
      description,
    },
    alternates: {
      canonical: absoluteUrl(canonical),
    },
  };
}

export default function FilesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
