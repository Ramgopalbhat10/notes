import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/fs/s3";
import { revalidateFileTags } from "@/lib/fs/file-cache";
import { deleteFileMeta } from "@/lib/fs/file-meta";
import { deleteFileVersions } from "@/lib/fs/file-versions";
import { ensureMatchingEtag } from "@/lib/fs/s3-object";

export async function deleteMarkdownFile({
  key,
  ifMatchEtag,
}: {
  key: string;
  ifMatchEtag?: string;
}): Promise<void> {
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
  void deleteFileVersions(key);

  const { deleteFile } = await import("@/lib/manifest-updater");
  await deleteFile({ key });
}
