import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { requireApiUser } from "@/lib/auth";
import {
  MANIFEST_CACHE_TAG,
  loadLatestManifest,
  type ManifestRecord,
} from "@/lib/manifest-store";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, max-age=30, s-maxage=300, stale-while-revalidate=60";

function formatEtag(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return `"${value}"`;
}

function parseIfNoneMatch(header: string | null): string[] {
  if (!header) {
    return [];
  }
  return header
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/^W\//i, "").replace(/"/g, ""))
    .filter((value): value is string => Boolean(value));
}

function etagMatches(header: string | null, etag: string | undefined): boolean {
  if (!etag) {
    return false;
  }
  if (header?.includes("*")) {
    return true;
  }
  const values = parseIfNoneMatch(header);
  return values.includes(etag);
}

function buildHeaders(etag?: string, source?: ManifestRecord["source"]): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", CACHE_CONTROL);
  const formatted = formatEtag(etag);
  if (formatted) {
    headers.set("ETag", formatted);
  }
  if (source) {
    headers.set("X-Manifest-Source", source);
  }
  return headers;
}

const getCachedManifest = unstable_cache(
  async () => {
    const record = await loadLatestManifest();
    if (!record) {
      throw new Error("Manifest unavailable");
    }
    return record;
  },
  ["file-tree-manifest"],
  {
    tags: [MANIFEST_CACHE_TAG],
    revalidate: false,
  },
);

export async function GET(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return new NextResponse(JSON.stringify({ error: authRes.error }), {
      status: authRes.status,
      headers: buildHeaders(undefined),
    });
  }

  try {
    const manifestRecord = await getCachedManifest();
    const ifNoneMatch = request.headers.get("if-none-match");

    if (etagMatches(ifNoneMatch, manifestRecord.etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: buildHeaders(manifestRecord.etag, manifestRecord.source),
      });
    }

    return new NextResponse(manifestRecord.body, {
      status: 200,
      headers: buildHeaders(manifestRecord.etag, manifestRecord.source),
    });
  } catch (error) {
    console.error("Failed to serve file tree manifest", error);
    return NextResponse.json({ error: "Tree manifest unavailable" }, { status: 503 });
  }
}
