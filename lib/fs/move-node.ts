import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import { mapWithConcurrencyLimit } from "@/lib/async/concurrency";
import { revalidateFileTags, toRelativeKeys } from "@/lib/fs/file-cache";
import { renameFileMeta } from "@/lib/fs/file-meta";
import { renameFileVersions } from "@/lib/fs/file-versions";
import { applyVaultPrefix, getBucket, getS3Client, stripVaultPrefix } from "@/lib/fs/s3";
import { deleteKeys, ensureDestClear, listKeys } from "@/lib/fs/s3-keys";
import { encodeCopySource } from "@/lib/fs/s3-object";
import { normalizeFileKey, normalizeFolderPrefix } from "@/lib/fs/fs-validation";
import { getErrorStatus, statusError } from "@/lib/http/errors";

const FOLDER_COPY_CONCURRENCY = 8;

export async function moveFolderInS3(fromRaw: string, toRaw: string, overwrite: boolean): Promise<void> {
  const fromPrefix = normalizeFolderPrefix(fromRaw);
  const toPrefix = normalizeFolderPrefix(toRaw);
  const bucket = getBucket();
  const client = getS3Client();
  const fromFull = applyVaultPrefix(fromPrefix);
  const toFull = applyVaultPrefix(toPrefix);

  const sourceKeys = await listKeys(bucket, fromFull);
  if (sourceKeys.length === 0) {
    throw statusError("Source folder not found", 404);
  }

  if (!overwrite) {
    await ensureDestClear(bucket, toFull);
  }

  const copyResults = await mapWithConcurrencyLimit(sourceKeys, FOLDER_COPY_CONCURRENCY, async (sourceKey) => {
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
  });

  await deleteKeys(bucket, sourceKeys);

  await revalidateFileTags([...toRelativeKeys(sourceKeys), ...toRelativeKeys(copyResults)]);
  for (let index = 0; index < sourceKeys.length; index += 1) {
    const sourceKey = stripVaultPrefix(sourceKeys[index] ?? "");
    const targetKey = stripVaultPrefix(copyResults[index] ?? "");
    if (sourceKey && targetKey && !sourceKey.endsWith("/") && !targetKey.endsWith("/")) {
      void renameFileMeta(sourceKey, targetKey);
      void renameFileVersions(sourceKey, targetKey);
    }
  }

  const { moveFolder } = await import("@/lib/manifest-updater");
  await moveFolder({ oldPrefix: fromPrefix, newPrefix: toPrefix });
}

export async function moveFileInS3(
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
      throw statusError("Destination already exists", 409);
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
      throw statusError("ETag mismatch", 409);
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
  void renameFileVersions(fromKey, toKey);

  const { moveFile } = await import("@/lib/manifest-updater");
  await moveFile({ oldKey: fromKey, newKey: toKey });

  return copyResult.CopyObjectResult?.ETag ?? undefined;
}

export async function moveVaultNode({
  fromRaw,
  toRaw,
  overwrite = false,
  ifMatchEtag,
}: {
  fromRaw: string;
  toRaw: string;
  overwrite?: boolean;
  ifMatchEtag?: string;
}): Promise<{ etag?: string }> {
  const isFolder = fromRaw.endsWith("/");
  if (isFolder !== toRaw.endsWith("/")) {
    throw statusError("Folder moves must target a folder prefix", 400);
  }

  if (isFolder) {
    const fromPrefix = normalizeFolderPrefix(fromRaw);
    const toPrefix = normalizeFolderPrefix(toRaw);
    if (toPrefix === fromPrefix || toPrefix.startsWith(fromPrefix)) {
      throw statusError("Cannot move a folder into its own subtree", 400);
    }
    await moveFolderInS3(fromRaw, toRaw, overwrite);
    return { etag: undefined };
  }

  const etag = await moveFileInS3(fromRaw, toRaw, overwrite, ifMatchEtag);
  return { etag };
}
