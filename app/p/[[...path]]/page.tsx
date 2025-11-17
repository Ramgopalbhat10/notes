import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

import { MarkdownPreview } from "@/components/markdown-preview";
import { getCachedFile } from "@/lib/file-cache";
import { getFileMeta } from "@/lib/file-meta";
import { normalizeFileKey } from "@/lib/fs-validation";
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

function deriveTitle(key: string, content: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch && headingMatch[1]) {
    return headingMatch[1].trim();
  }
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
  let key: string;
  try {
    key = normalizeFileKey(relativePath);
  } catch {
    return null;
  }
  const meta = await getFileMeta(key);
  if (!meta.public) {
    return null;
  }
  try {
    const cached = await getCachedFile(key);
    const title = deriveTitle(key, cached.content);
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
  params: { path?: string[] };
}): Promise<Metadata> {
  const relative = decodePathSegments(params.path);
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

async function PublicFileContent({ relativePath }: { relativePath: string | null }) {
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <header className="mb-8 space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{file.title}</h1>
          {lastUpdated ? (
            <p className="text-sm text-muted-foreground md:text-base">Last updated {lastUpdated}</p>
          ) : null}
        </header>
        <MarkdownPreview content={file.content} />
      </article>
    </main>
  );
}

export default function PublicFilePage({
  params,
}: {
  params: { path?: string[] };
}) {
  const relative = decodePathSegments(params.path);

  return (
    <Suspense fallback={<PublicFileFallback />}>
      <PublicFileContent relativePath={relative} />
    </Suspense>
  );
}
