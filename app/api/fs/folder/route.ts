import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireApiUser } from "@/lib/auth";
import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/s3";
import { normalizeFolderPrefix } from "@/lib/fs-validation";
import { revalidateFileTags, toRelativeKeys } from "@/lib/file-cache";
import { MANIFEST_CACHE_TAG } from "@/lib/manifest-store";
import { deleteFileMeta } from "@/lib/file-meta";

type StatusError = Error & {
  status?: number;
  $metadata?: {
    httpStatusCode?: number;
  };
};

async function listKeys(bucket: string, prefix: string) {
  const client = getS3Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    response.Contents?.forEach((object) => {
      if (object.Key) {
        keys.push(object.Key);
      }
    });
    continuationToken = response.NextContinuationToken ?? undefined;
  } while (continuationToken);
  return keys;
}

async function deleteKeys(bucket: string, keys: string[]) {
  const client = getS3Client();
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000));
  }

  for (const chunk of chunks) {
    if (chunk.length === 1) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: chunk[0],
        }),
      );
    } else if (chunk.length > 1) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
    }
  }
}

function getStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const direct = (error as StatusError).status;
    if (typeof direct === "number") {
      return direct;
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
  const message = getMessage(error) ?? "Failed to delete folder";
  if (status === 400) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error("Failed to delete folder", error);
  return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
}

export async function DELETE(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const prefix = normalizeFolderPrefix(body?.prefix);
    const recursive = Boolean(body?.recursive);

    const bucket = getBucket();
    const fullPrefix = applyVaultPrefix(prefix);

    const keys = await listKeys(bucket, fullPrefix);

    if (!recursive) {
      const remaining = keys.filter((key) => key !== fullPrefix);
      if (remaining.length > 0) {
        const error: StatusError = Object.assign(
          new Error("Folder is not empty. Pass recursive=true to delete"),
          { status: 400 },
        );
        throw error;
      }
    }

    if (keys.length === 0) {
      // Nothing to delete; treat as success.
      revalidateTag(MANIFEST_CACHE_TAG, "max");
      return new NextResponse(null, { status: 204 });
    }

    await deleteKeys(bucket, keys);

    const relativeKeys = toRelativeKeys(keys);
    if (relativeKeys.length > 0) {
      await revalidateFileTags(relativeKeys);
      for (const key of relativeKeys) {
        void deleteFileMeta(key);
      }
    }

    // Incrementally update manifest instead of invalidating
    const { deleteFolder } = await import("@/lib/manifest-updater");
    await deleteFolder({ prefix });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
