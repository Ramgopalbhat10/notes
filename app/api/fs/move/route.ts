import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { mapWithConcurrencyLimit } from "@/lib/async/concurrency";
import { requireApiUser } from "@/lib/auth";
import { applyVaultPrefix, getBucket, getS3Client, stripVaultPrefix } from "@/lib/fs/s3";
import { normalizeFileKey, normalizeFolderPrefix } from "@/lib/fs/fs-validation";
import { revalidateFileTags, toRelativeKeys } from "@/lib/fs/file-cache";
import { renameFileMeta } from "@/lib/fs/file-meta";
import { getErrorMessage, getErrorStatus, type StatusError } from "@/lib/http/errors";

const FOLDER_COPY_CONCURRENCY = 8;
const DELETE_CHUNK_CONCURRENCY = 4;

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
  await mapWithConcurrencyLimit(chunks, DELETE_CHUNK_CONCURRENCY, async (chunk) => {
    if (chunk.length === 1) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: chunk[0],
        }),
      );
      return;
    }

    if (chunk.length > 1) {
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
  });
}

function handleError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error) ?? "Failed to move object";
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

async function moveFolderInS3(
  fromRaw: string,
  toRaw: string,
  overwrite: boolean,
): Promise<void> {
  const fromPrefix = normalizeFolderPrefix(fromRaw);
  const toPrefix = normalizeFolderPrefix(toRaw);
  const bucket = getBucket();
  const client = getS3Client();
  const fromFull = applyVaultPrefix(fromPrefix);
  const toFull = applyVaultPrefix(toPrefix);

  const sourceKeysPromise = listKeys(bucket, fromFull);
  const destCheckPromise = overwrite ? Promise.resolve() : ensureDestClear(bucket, toFull);

  const [sourceKeysResult, destCheckResult] = await Promise.allSettled([
    sourceKeysPromise,
    destCheckPromise,
  ]);

  if (sourceKeysResult.status === "rejected") {
    throw sourceKeysResult.reason;
  }

  const sourceKeys = sourceKeysResult.value;
  if (sourceKeys.length === 0) {
    throw Object.assign(new Error("Source folder not found"), { status: 404 }) as StatusError;
  }

  if (destCheckResult.status === "rejected") {
    throw destCheckResult.reason;
  }

  const copyResults = await mapWithConcurrencyLimit(
    sourceKeys,
    FOLDER_COPY_CONCURRENCY,
    async (sourceKey) => {
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
      return targetKey;
    },
  );

  await deleteKeys(bucket, sourceKeys);

  await revalidateFileTags([...toRelativeKeys(sourceKeys), ...toRelativeKeys(copyResults)]);
  for (let index = 0; index < sourceKeys.length; index += 1) {
    const sourceKey = stripVaultPrefix(sourceKeys[index] ?? "");
    const targetKey = stripVaultPrefix(copyResults[index] ?? "");
    if (sourceKey && targetKey && !sourceKey.endsWith("/") && !targetKey.endsWith("/")) {
      void renameFileMeta(sourceKey, targetKey);
    }
  }

  // Incrementally update manifest instead of invalidating
  const { moveFolder } = await import("@/lib/manifest-updater");
  await moveFolder({ oldPrefix: fromPrefix, newPrefix: toPrefix });
}

async function moveFileInS3(
  fromRaw: string,
  toRaw: string,
  overwrite: boolean,
  ifMatchEtag: string | undefined,
): Promise<string | undefined> {
  const fromKey = normalizeFileKey(fromRaw);
  const toKey = normalizeFileKey(toRaw);
  const bucket = getBucket();
  const client = getS3Client();
  const fromFull = applyVaultPrefix(fromKey);
  const toFull = applyVaultPrefix(toKey);

  if (!overwrite) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: toFull }));
      throw Object.assign(new Error("Destination already exists"), { status: 409 }) as StatusError;
    } catch (error) {
      const status = getErrorStatus(error);
      if (status && status !== 404) {
        throw error;
      }
    }
  }

  if (ifMatchEtag) {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: fromFull }));
    const currentEtag = head.ETag;
    if (!currentEtag || currentEtag.replace(/"/g, "") !== ifMatchEtag.replace(/"/g, "")) {
      throw Object.assign(new Error("ETag mismatch"), { status: 409 }) as StatusError;
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

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: fromFull }));

  await revalidateFileTags([fromKey, toKey]);
  void renameFileMeta(fromKey, toKey);

  // Incrementally update manifest instead of invalidating
  const { moveFile } = await import("@/lib/manifest-updater");
  await moveFile({ oldKey: fromKey, newKey: toKey });

  return copyResult.CopyObjectResult?.ETag ?? undefined;
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

    if (isFolder) {
      await moveFolderInS3(fromRaw, toRaw, overwrite);
      return NextResponse.json({ etag: undefined });
    }

    const etag = await moveFileInS3(fromRaw, toRaw, overwrite, ifMatchEtag);
    return NextResponse.json({ etag });
  } catch (error) {
    return handleError(error);
  }
}
