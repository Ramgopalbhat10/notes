import type { Metadata } from "next";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { connection } from "next/server";

import {
  absoluteUrl,
  decodePathSegments,
  filesCanonicalPath,
  workspaceDescription,
  workspaceTitle,
} from "@/lib/platform/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: { path?: string[] };
}): Promise<Metadata> {
  const { path } = await params;
  const relativePath = decodePathSegments(path);
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

async function DynamicMarker() {
  await connection();
  return null;
}

export default function FilesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMarker />
      </Suspense>
      {children}
    </>
  );
}
