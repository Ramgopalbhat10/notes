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
} from "@/lib/site-metadata";

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

async function FilesConnectionGate({ children }: { children: ReactNode }) {
  await connection();
  return <>{children}</>;
}

function FilesSuspenseFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Loading workspace…
    </div>
  );
}

export default function FilesLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FilesSuspenseFallback />}>
      <FilesConnectionGate>{children}</FilesConnectionGate>
    </Suspense>
  );
}
