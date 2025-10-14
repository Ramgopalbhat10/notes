import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/s3";
import { normalizeFileKey } from "@/lib/fs-validation";
import { s3BodyToString } from "@/lib/s3-body";

type StatusError = Error & {
  status?: number;
  $metadata?: {
    httpStatusCode?: number;
  };
};

export const runtime = "nodejs";

const CACHE_CONTROL_HEADER = "public, max-age=60, stale-while-revalidate=30";

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
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error("S3 operation failed", error);
  return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
}

function normalizeEtag(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.replace(/^W\//i, "").replace(/"/g, "");
}

function parseIfNoneMatch(header: string | null): string[] {
  if (!header) {
    return [];
  }
  return header
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((value) => normalizeEtag(value))
    .filter((value): value is string => Boolean(value));
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = normalizeFileKey(url.searchParams.get("key"));
    const bucket = getBucket();
    const client = getS3Client();
    const fullKey = applyVaultPrefix(key);

    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: fullKey,
      }),
    );

    const etagHeader = head.ETag ?? undefined;
    const normalizedEtag = normalizeEtag(etagHeader);
    const lastModifiedDate = head.LastModified ?? null;
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
      if (etagHeader) {
        headers.set("ETag", etagHeader);
      }
      if (lastModifiedHttp) {
        headers.set("Last-Modified", lastModifiedHttp);
      }
      return new NextResponse(null, {
        status: 304,
        headers,
      });
    }

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: fullKey,
      }),
    );

    const content = await s3BodyToString(response.Body);

    const responseEtag = response.ETag ?? etagHeader;
    const responseLastModified = response.LastModified ?? lastModifiedDate ?? undefined;
    const headers = new Headers();
    headers.set("Cache-Control", CACHE_CONTROL_HEADER);
    if (responseEtag) {
      headers.set("ETag", responseEtag);
    }
    if (responseLastModified) {
      headers.set("Last-Modified", responseLastModified.toUTCString());
    }

    return NextResponse.json(
      {
        key,
        content,
        etag: responseEtag ?? undefined,
        lastModified: responseLastModified?.toISOString(),
      },
      { headers },
    );
  } catch (error) {
    return handleS3Error(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const key = normalizeFileKey(body?.key);
    const content = typeof body?.content === "string" ? body.content : "";
    const ifMatchEtag = typeof body?.ifMatchEtag === "string" ? body.ifMatchEtag : undefined;

    const bucket = getBucket();
    const client = getS3Client();

    const result = await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: applyVaultPrefix(key),
        Body: content,
        ContentType: "text/markdown; charset=utf-8",
        ...(ifMatchEtag ? { IfMatch: ifMatchEtag } : {}),
      }),
    );

    return NextResponse.json({
      etag: result.ETag ?? undefined,
    });
  } catch (error) {
    return handleS3Error(error);
  }
}

export async function DELETE(request: NextRequest) {
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

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleS3Error(error);
  }
}
