import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { normalizeFileKey } from "@/lib/fs-validation";
import { getCachedFile } from "@/lib/file-cache";
import { getFileMeta } from "@/lib/file-meta";
import { normalizeEtag, parseIfNoneMatch } from "@/lib/etag";

const CACHE_CONTROL_HEADER = "public, max-age=60, s-maxage=60, stale-while-revalidate=30";

function buildHeaders(cached: Awaited<ReturnType<typeof getCachedFile>>): Headers {
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_CONTROL_HEADER);
  if (cached.etag) {
    headers.set("ETag", `"${cached.etag}"`);
  }
  if (cached.lastModified) {
    const lastModifiedDate = new Date(cached.lastModified);
    if (!Number.isNaN(lastModifiedDate.getTime())) {
      headers.set("Last-Modified", lastModifiedDate.toUTCString());
    }
  }
  headers.set("X-File-Cache", cached.cacheStatus.toUpperCase());
  return headers;
}

function decodeSlug(slug: readonly string[]): string {
  return slug.map((segment) => decodeURIComponent(segment)).join("/");
}

function notFoundResponse() {
  return NextResponse.json({ error: "File not found" }, { status: 404 });
}

type RouteContext = {
  params: Promise<{ slug?: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    noStore();
    const { slug } = await context.params;
    if (!slug || slug.length === 0) {
      return notFoundResponse();
    }
    const key = normalizeFileKey(decodeSlug(slug));
    const meta = await getFileMeta(key);
    if (!meta.public) {
      return notFoundResponse();
    }

    const cached = await getCachedFile(key);
    const normalizedEtag = cached.etag ?? null;
    const lastModifiedDate = cached.lastModified ? new Date(cached.lastModified) : null;

    const incomingEtags = parseIfNoneMatch(request.headers.get("if-none-match"));
    const ifModifiedSinceRaw = request.headers.get("if-modified-since");
    const ifModifiedSince = ifModifiedSinceRaw ? new Date(ifModifiedSinceRaw) : null;
    const hasValidIfModifiedSince = Boolean(ifModifiedSince && !Number.isNaN(ifModifiedSince.getTime()));

    const etagMatches = normalizedEtag ? incomingEtags.includes(normalizedEtag) : false;
    const modifiedSinceMatches =
      hasValidIfModifiedSince && lastModifiedDate ? lastModifiedDate <= ifModifiedSince! : false;

    if (etagMatches || modifiedSinceMatches) {
      const headers = buildHeaders(cached);
      return new NextResponse(null, {
        status: 304,
        headers,
      });
    }

    const headers = buildHeaders(cached);

    return NextResponse.json(
      {
        key,
        content: cached.content,
        etag: cached.etag ?? undefined,
        lastModified: cached.lastModified ?? undefined,
      },
      { headers },
    );
  } catch (error) {
    console.error("Failed to serve public file", error);
    return notFoundResponse();
  }
}
