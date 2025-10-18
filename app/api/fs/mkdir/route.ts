import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireApiUser } from "@/lib/auth";
import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/s3";
import { normalizeFolderPrefix } from "@/lib/fs-validation";
import { MANIFEST_CACHE_TAG } from "@/lib/manifest-store";

type StatusError = Error & {
  status?: number;
  $metadata?: {
    httpStatusCode?: number;
  };
};

export const runtime = "nodejs";

function getStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const status = (error as StatusError).status;
    if (typeof status === "number") {
      return status;
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

function handleError(error: unknown) {
  const status = getStatus(error);
  const message = getMessage(error) ?? "Failed to create folder";
  if (status === 409) {
    return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
  }
  if (status === 400) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error("Failed to create folder", error);
  return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const prefix = normalizeFolderPrefix(body?.prefix);

    const bucket = getBucket();
    const client = getS3Client();
    const fullKey = applyVaultPrefix(prefix);

    // Check if folder already exists by attempting a head on the placeholder object.
    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: fullKey,
        }),
      );
      const conflict: StatusError = Object.assign(new Error("Folder already exists"), { status: 409 });
      throw conflict;
    } catch (error) {
      const status = getStatus(error);
      if (status && status !== 404) {
        throw error;
      }
      // 404 means it doesn't exist yet; continue.
    }

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fullKey,
        Body: "",
        ContentType: "application/x-directory",
      }),
    );

    revalidateTag(MANIFEST_CACHE_TAG);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
