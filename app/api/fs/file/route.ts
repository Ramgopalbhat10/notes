import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireApiUser } from "@/lib/auth";
import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/s3";
import { normalizeFileKey } from "@/lib/fs-validation";
import { getCachedFile, revalidateFileTags, setFileCacheRecord } from "@/lib/file-cache";
import { MANIFEST_CACHE_TAG } from "@/lib/manifest-store";
import { deleteFileMeta } from "@/lib/file-meta";
import { normalizeEtag, parseIfNoneMatch } from "@/lib/etag";
import { writeMarkdownFile } from "@/lib/file-writer";

type StatusError = Error & {
  status?: number;
  $metadata?: {
    httpStatusCode?: number;
  };
};

const CACHE_CONTROL_HEADER = "private, no-cache, must-revalidate";

async function ensureMatchingEtag({
  bucket,
  key,
  expectedEtag,
}: {
  bucket: string;
  key: string;
  expectedEtag: string;
}): Promise<void> {
  const client = getS3Client();
  const head = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  const currentEtag = head.ETag;
  if (!currentEtag || currentEtag.replace(/"/g, "") !== expectedEtag.replace(/"/g, "")) {
    const error: StatusError = Object.assign(new Error("ETag mismatch"), { status: 409 });
    throw error;
  }
}

function getStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const fromStatus = (error as StatusError).status;
    if (typeof fromStatus === "number") {
      return fromStatus;
    }
    const metaStatus = (error as StatusError).$metadata?.httpStatusCode;
    if (typeof metaStatus === "number") {
      return metaStatus;
    }
  }
  return undefined;
}

function getMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return undefined;
}

function handleS3Error(error: unknown) {
  const status = getStatus(error);
  const message = getMessage(error) ?? "Unexpected S3 error";
  if (status === 404) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if (status === 409) {
    return NextResponse.json({ error: "ETag mismatch" }, { status: 409 });
  }
  if (status === 412) {
    return NextResponse.json({ error: "Precondition failed" }, { status: 412 });
  }
  if (status === 400) {
    console.error("S3 Bad Request", error);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
  console.error("S3 operation failed", error);
  return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const url = new URL(request.url);
    const key = normalizeFileKey(url.searchParams.get("key"));
    const cached = await getCachedFile(key);
    const normalizedEtag = cached.etag ?? null;
    const lastModifiedDate = cached.lastModified ? new Date(cached.lastModified) : null;
    const lastModifiedHttp = lastModifiedDate ? lastModifiedDate.toUTCString() : undefined;

    const incomingEtags = parseIfNoneMatch(request.headers.get("if-none-match"));
    const ifModifiedSinceRaw = request.headers.get("if-modified-since");
    const ifModifiedSince = ifModifiedSinceRaw ? new Date(ifModifiedSinceRaw) : null;
    const hasValidIfModifiedSince = Boolean(ifModifiedSince && !Number.isNaN(ifModifiedSince.getTime()));

    const etagMatches = normalizedEtag ? incomingEtags.includes(normalizedEtag) : false;
    const modifiedSinceMatches =
      hasValidIfModifiedSince && lastModifiedDate ? lastModifiedDate <= ifModifiedSince! : false;

    if (etagMatches || modifiedSinceMatches) {
      const headers = new Headers();
      headers.set("Cache-Control", CACHE_CONTROL_HEADER);
      if (cached.etag) {
        headers.set("ETag", `"${cached.etag}"`);
      }
      if (lastModifiedHttp) {
        headers.set("Last-Modified", lastModifiedHttp);
      }
      headers.set("X-File-Cache", cached.cacheStatus.toUpperCase());
      return new NextResponse(null, {
        status: 304,
        headers,
      });
    }

    const headers = new Headers();
    headers.set("Cache-Control", CACHE_CONTROL_HEADER);
    if (cached.etag) {
      headers.set("ETag", `"${cached.etag}"`);
    }
    if (lastModifiedDate) {
      headers.set("Last-Modified", lastModifiedDate.toUTCString());
    }
    headers.set("X-File-Cache", cached.cacheStatus.toUpperCase());

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
    return handleS3Error(error);
  }
}

export async function PUT(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const key = normalizeFileKey(body?.key);
    const content = typeof body?.content === "string" ? body.content : "";
    const ifMatchEtag = typeof body?.ifMatchEtag === "string" ? body.ifMatchEtag : undefined;
    const { etag: newEtag, lastModified } = await writeMarkdownFile({ key, content, ifMatchEtag });

    await revalidateFileTags([key]);

    await setFileCacheRecord(key, {
      key,
      content,
      etag: newEtag,
      lastModified,
      fetchedAt: new Date().toISOString(),
    });

    // Incrementally update manifest instead of invalidating
    const { addOrUpdateFile } = await import("@/lib/manifest-updater");
    await addOrUpdateFile({
      key,
      etag: newEtag,
      lastModified,
      size: Buffer.byteLength(content, "utf-8"),
    });

    return NextResponse.json({
      etag: newEtag,
    });
  } catch (error) {
    return handleS3Error(error);
  }
}

export async function DELETE(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const key = normalizeFileKey(body?.key);
    const ifMatchEtag = typeof body?.ifMatchEtag === "string" ? body.ifMatchEtag : undefined;

    const bucket = getBucket();
    const client = getS3Client();
    const fullKey = applyVaultPrefix(key);

    if (ifMatchEtag) {
      await ensureMatchingEtag({ bucket, key: fullKey, expectedEtag: ifMatchEtag });
    }

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: fullKey,
      }),
    );

    await revalidateFileTags([key]);
    void deleteFileMeta(key);

    // Incrementally update manifest instead of invalidating
    const { deleteFile } = await import("@/lib/manifest-updater");
    await deleteFile({ key });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleS3Error(error);
  }
}
