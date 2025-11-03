import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MarkdownPreview } from "@/components/markdown-preview";
import { normalizeFileKey } from "@/lib/fs-validation";
import { getCachedFile } from "@/lib/file-cache";
import { getFileMeta } from "@/lib/file-meta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicFile = {
  key: string;
  title: string;
  content: string;
  lastModified: string | null;
};

function decodePathSegments(segments: readonly string[] | undefined): string | null {
  if (!segments || segments.length === 0) {
    return null;
  }
  return segments.map((segment) => decodeURIComponent(segment)).join("/");
}

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
  params: Promise<{ path?: string[] }>;
}): Promise<Metadata> {
  const resolved = await params;
  const relative = decodePathSegments(resolved.path);
  const file = await loadPublicFile(relative);
  if (!file) {
    return {
      title: "File not found",
    };
  }
  return {
    title: `${file.title} — Shared Vault`,
    description: `Public copy of ${file.key}`,
  };
}

export default async function PublicFilePage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const resolved = await params;
  const relative = decodePathSegments(resolved.path);
  const file = await loadPublicFile(relative);
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
