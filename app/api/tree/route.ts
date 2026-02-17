import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import {
  MANIFEST_CACHE_TAG,
  loadLatestManifest,
  type ManifestRecord,
} from "@/lib/manifest-store";
import { parseIfNoneMatch } from "@/lib/etag";

const CACHE_CONTROL = "private, no-cache, must-revalidate";

function formatEtag(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return `"${value}"`;
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

export async function GET(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return new NextResponse(JSON.stringify({ error: authRes.error }), {
      status: authRes.status,
      headers: buildHeaders(undefined),
    });
  }

  try {
    const manifestRecord = await loadLatestManifest();
    if (!manifestRecord) {
      throw new Error("Manifest unavailable");
    }

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
