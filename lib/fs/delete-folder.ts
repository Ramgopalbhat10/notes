import { revalidateTag } from "next/cache";

import { MANIFEST_CACHE_TAG } from "@/lib/cache/manifest-store";
import { revalidateFileTags, toRelativeKeys } from "@/lib/fs/file-cache";
import { deleteFileMetas } from "@/lib/fs/file-meta";
import { deleteFileVersionsByPrefix } from "@/lib/fs/file-versions";
import { applyVaultPrefix, getBucket } from "@/lib/fs/s3";
import { deleteKeys, listKeys } from "@/lib/fs/s3-keys";
import { normalizeFolderPrefix } from "@/lib/fs/fs-validation";
import { statusError } from "@/lib/http/errors";

export async function deleteVaultFolder({
  prefix,
  recursive,
}: {
  prefix: string;
  recursive: boolean;
}): Promise<void> {
  const normalized = normalizeFolderPrefix(prefix);
  const bucket = getBucket();
  const fullPrefix = applyVaultPrefix(normalized);

  const keys = await listKeys(bucket, fullPrefix);

  if (!recursive) {
    const remaining = keys.filter((key) => key !== fullPrefix);
    if (remaining.length > 0) {
      throw statusError("Folder is not empty. Pass recursive=true to delete", 400);
    }
  }

  if (keys.length === 0) {
    revalidateTag(MANIFEST_CACHE_TAG, "max");
    return;
  }

  await deleteKeys(bucket, keys);

  const relativeKeys = toRelativeKeys(keys);
  if (relativeKeys.length > 0) {
    await revalidateFileTags(relativeKeys);
    void deleteFileMetas(relativeKeys);
  }
  void deleteFileVersionsByPrefix(normalized);

  const { deleteFolder } = await import("@/lib/manifest-updater");
  await deleteFolder({ prefix: normalized });
}
