import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireApiUser } from "@/lib/auth";
import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/s3";
import { normalizeFileKey, normalizeFolderPrefix } from "@/lib/fs-validation";
import { revalidateFileTags, toRelativeKeys } from "@/lib/file-cache";
import { MANIFEST_CACHE_TAG } from "@/lib/manifest-store";

export const runtime = "nodejs";

type StatusError = Error & {
  status?: number;
  $metadata?: {
    httpStatusCode?: number;
  };
};

function encodeCopySource(bucket: string, key: string) {
  return encodeURIComponent(`${bucket}/${key}`).replace(/%2F/g, "/");
}

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

async function ensureDestClear(bucket: string, destPrefix: string) {
  const client = getS3Client();
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: destPrefix,
      MaxKeys: 1,
    }),
  );
  if ((response.Contents?.length ?? 0) > 0) {
    const error: StatusError = Object.assign(new Error("Destination already exists"), { status: 409 });
    throw error;
  }
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

function handleError(error: unknown) {
  const status = getStatus(error);
  const message = getMessage(error) ?? "Failed to move object";
  if (status === 404) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  if (status === 409) {
    return NextResponse.json({ error: "Destination already exists" }, { status: 409 });
  }
  if (status === 400) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error("Failed to move object", error);
  return NextResponse.json({ error: "Failed to move object" }, { status: 500 });
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

export async function POST(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }
  try {
    const body = await request.json();
    const fromRaw = body?.fromKey as string | undefined;
    const toRaw = body?.toKey as string | undefined;
    const overwrite = Boolean(body?.overwrite);
    const ifMatchEtag = typeof body?.ifMatchEtag === "string" ? body.ifMatchEtag : undefined;

    if (!fromRaw || !toRaw) {
      throw Object.assign(new Error("fromKey and toKey are required"), { status: 400 });
    }

    const isFolder = fromRaw.endsWith("/");
    if (isFolder !== toRaw.endsWith("/")) {
      throw Object.assign(new Error("Folder moves must target a folder prefix"), { status: 400 });
    }

    const bucket = getBucket();
    const client = getS3Client();

    if (isFolder) {
      const fromPrefix = normalizeFolderPrefix(fromRaw);
      const toPrefix = normalizeFolderPrefix(toRaw);
      const fromFull = applyVaultPrefix(fromPrefix);
      const toFull = applyVaultPrefix(toPrefix);

      const sourceKeys = await listKeys(bucket, fromFull);
      if (sourceKeys.length === 0) {
        const error: StatusError = Object.assign(new Error("Source folder not found"), { status: 404 });
        throw error;
      }

      if (!overwrite) {
        await ensureDestClear(bucket, toFull);
      }

      const copyResults = [] as string[];
      for (const sourceKey of sourceKeys) {
        const relative = sourceKey.slice(fromFull.length);
        const targetKey = `${toFull}${relative}`;
        await client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: encodeCopySource(bucket, sourceKey),
            Key: targetKey,
            MetadataDirective: "COPY",
          }),
        );
        copyResults.push(targetKey);
      }

      await deleteKeys(bucket, sourceKeys);

      const sourceRelatives = toRelativeKeys(sourceKeys);
      const targetRelatives = toRelativeKeys(copyResults);
      revalidateFileTags([...sourceRelatives, ...targetRelatives]);
      revalidateTag(MANIFEST_CACHE_TAG);

      return NextResponse.json({ etag: undefined });
    }

    const fromKey = normalizeFileKey(fromRaw);
    const toKey = normalizeFileKey(toRaw);
    const fromFull = applyVaultPrefix(fromKey);
    const toFull = applyVaultPrefix(toKey);

    if (!overwrite) {
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: toFull,
          }),
        );
        const error: StatusError = Object.assign(new Error("Destination already exists"), { status: 409 });
        throw error;
      } catch (error) {
        const status = getStatus(error);
        if (status && status !== 404) {
          throw error;
        }
      }
    }

    if (ifMatchEtag) {
      const head = await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: fromFull,
        }),
      );
      const currentEtag = head.ETag;
      if (!currentEtag || currentEtag.replace(/"/g, "") !== ifMatchEtag.replace(/"/g, "")) {
        const mismatch: StatusError = Object.assign(new Error("ETag mismatch"), { status: 409 });
        throw mismatch;
      }
    }

    const copyResult = await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeCopySource(bucket, fromFull),
        Key: toFull,
        MetadataDirective: "COPY",
      }),
    );

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: fromFull,
      }),
    );

    revalidateFileTags([fromKey, toKey]);
    revalidateTag(MANIFEST_CACHE_TAG);

    return NextResponse.json({ etag: copyResult.CopyObjectResult?.ETag ?? undefined });
  } catch (error) {
    return handleError(error);
  }
}
