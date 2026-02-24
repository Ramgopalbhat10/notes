import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

import { PublicFileView } from "@/components/public/public-file-view";
import { getCachedFile, getFileCacheTag } from "@/lib/file-cache";
import { getFileMeta, getFileMetaCacheTag } from "@/lib/file-meta";
import { normalizeFileKey } from "@/lib/fs-validation";
import { MANIFEST_CACHE_TAG } from "@/lib/manifest-store";
import {
  absoluteUrl,
  decodePathSegments,
  publicCanonicalPath,
  siteMetadata,
} from "@/lib/site-metadata";

type PublicFile = {
  key: string;
  title: string;
  content: string;
  lastModified: string | null;
};

function stripExtension(name: string): string {
  return name.replace(/\.md$/i, "");
}

function deriveTitle(key: string): string {
  const parts = key.split("/");
  const last = parts[parts.length - 1] ?? key;
  const fallback = stripExtension(last) || "Untitled";
  return fallback.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

async function loadPublicFile(relativePath: string | null): Promise<PublicFile | null> {
  "use cache";
  cacheLife("seconds");

  if (!relativePath) {
    return null;
  }

  // Add manifest cache tag for slug resolution
  cacheTag(MANIFEST_CACHE_TAG);

  // First try to resolve as a slug
  const { resolveSlugToKey } = await import("@/lib/slug-resolver");
  let key: string | null = await resolveSlugToKey(relativePath);

  // If slug resolution failed, try as raw key
  if (!key) {
    try {
      key = normalizeFileKey(relativePath);
    } catch {
      return null;
    }
  }

  // Add cache tag for this file's metadata (public status)
  cacheTag(getFileMetaCacheTag(key));

  const meta = await getFileMeta(key);
  if (!meta.public) {
    return null;
  }

  // Add cache tag for this file's content
  cacheTag(getFileCacheTag(key));

  try {
    const cached = await getCachedFile(key);
    const title = deriveTitle(key);
    return {
      key,
      title,
      content: cached.content,
      lastModified: cached.lastModified ?? null,
    };
  } catch (error) {
    console.error("Failed to load public file", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}): Promise<Metadata> {
  const { path } = await params;
  const relative = decodePathSegments(path);
  const file = await loadPublicFile(relative);
  const canonical = publicCanonicalPath(relative);
  const canonicalUrl = absoluteUrl(canonical);
  if (!file) {
    const title = "Public note not found";
    const description = "This shared note is either private or no longer exists.";
    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: siteMetadata.product,
        type: "article",
      },
      twitter: {
        title,
        description,
      },
    };
  }

  const pageTitle = `${file.title} - Shared Vault`;
  const description = `Read "${file.title}" directly from the Markdown Vault.`;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: siteMetadata.product,
      type: "article",
      modifiedTime: file.lastModified ?? undefined,
    },
    twitter: {
      title: pageTitle,
      description,
      card: "summary_large_image",
    },
  };
}

function PublicFileFallback() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-2/3 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-64 w-full rounded bg-muted" />
        </div>
      </article>
    </main>
  );
}

async function PublicFileContent({ paramsPromise }: { paramsPromise: Promise<{ path?: string[] }> }) {
  const { path } = await paramsPromise;
  const relativePath = decodePathSegments(path);
  const file = await loadPublicFile(relativePath);
  if (!file) {
    notFound();
  }

  const lastUpdated = file.lastModified
    ? new Date(file.lastModified).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return <PublicFileView title={file.title} lastUpdated={lastUpdated} content={file.content} />;
}

export default function PublicFilePage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  return (
    <Suspense fallback={<PublicFileFallback />}>
      <PublicFileContent paramsPromise={params} />
    </Suspense>
  );
}
