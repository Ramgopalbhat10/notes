import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

import { writeManifestCache, readManifestCache } from "@/lib/file-tree-cache";
import {
  FILE_TREE_MANIFEST_FILENAME,
  validateFileTreeManifest,
} from "@/lib/file-tree-manifest";
import { getBucket, getS3Client } from "@/lib/s3";
import { s3BodyToString } from "@/lib/s3-body";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, max-age=30, s-maxage=300, stale-while-revalidate=60";

function normalizeEtag(value: string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.replace(/^W\//i, "").replace(/"/g, "");
}

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
    .map((part) => normalizeEtag(part.replace(/^W\//i, "")))
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

function buildHeaders(etag?: string): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", CACHE_CONTROL);
  const formatted = formatEtag(etag);
  if (formatted) {
    headers.set("ETag", formatted);
  }
  return headers;
}

export async function GET(request: NextRequest) {
  const client = getS3Client();
  const bucket = getBucket();
  const ifNoneMatch = request.headers.get("if-none-match");

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: FILE_TREE_MANIFEST_FILENAME,
      }),
    );

    const etag = normalizeEtag(response.ETag ?? undefined);
    if (etagMatches(ifNoneMatch, etag)) {
      return new NextResponse(null, { status: 304, headers: buildHeaders(etag) });
    }

    const body = await s3BodyToString(response.Body);
    const parsed = JSON.parse(body);
    const validation = validateFileTreeManifest(parsed);
    if (!validation.success) {
      throw new Error(`Invalid manifest schema: ${validation.errors.join(", ")}`);
    }

    const normalizedBody = JSON.stringify(validation.manifest);

    await writeManifestCache({ etag, body: normalizedBody });
    return new NextResponse(normalizedBody, { status: 200, headers: buildHeaders(etag) });
  } catch (error) {
    console.error("Failed to fetch file tree manifest", error);
    const cached = await readManifestCache();
    if (cached) {
      try {
        const cachedParsed = JSON.parse(cached.body);
        const validation = validateFileTreeManifest(cachedParsed);
        if (!validation.success) {
          console.error("Cached manifest invalid", validation.errors);
        } else {
          const normalizedCachedBody = JSON.stringify(validation.manifest);
          if (etagMatches(ifNoneMatch, cached.etag)) {
            return new NextResponse(null, { status: 304, headers: buildHeaders(cached.etag ?? undefined) });
          }
          return new NextResponse(normalizedCachedBody, {
            status: 200,
            headers: buildHeaders(cached.etag ?? undefined),
          });
        }
      } catch (cacheError) {
        console.error("Failed to parse cached manifest", cacheError);
      }
    }
    return NextResponse.json({ error: "Tree manifest unavailable" }, { status: 503 });
  }
}
