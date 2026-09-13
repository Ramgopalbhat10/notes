import { PutObjectCommand } from "@aws-sdk/client-s3";

import { applyVaultPrefix, ensureFolderPath, getBucket, getS3Client } from "@/lib/fs/s3";
import { normalizeFolderPrefix } from "@/lib/fs/fs-validation";
import { objectExists } from "@/lib/fs/s3-object";
import { statusError } from "@/lib/http/errors";
import { getParentPath } from "@/lib/platform/paths";

export async function createVaultFolder({
  prefix,
  existOk = false,
}: {
  prefix: string;
  existOk?: boolean;
}): Promise<{ created: boolean; prefix: string }> {
  const normalized = normalizeFolderPrefix(prefix);
  const bucket = getBucket();
  const client = getS3Client();
  const fullKey = applyVaultPrefix(normalized);

  const exists = await objectExists(fullKey);
  if (exists) {
    if (existOk) {
      const { addFolder } = await import("@/lib/manifest-updater");
      await addFolder({ prefix: normalized });
      return { created: false, prefix: normalized };
    }
    throw statusError("Folder already exists", 409);
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      Body: "",
      ContentType: "application/x-directory",
    }),
  );

  const { addFolder } = await import("@/lib/manifest-updater");
  await addFolder({ prefix: normalized });
  return { created: true, prefix: normalized };
}

export async function ensureAncestorFolders(childPath: string): Promise<void> {
  const folderPath = childPath.endsWith("/") ? childPath : getParentPath(childPath);
  if (!folderPath) {
    return;
  }

  const normalized = ensureFolderPath(folderPath);
  const parts: string[] = [];
  for (const segment of normalized.split("/").filter(Boolean)) {
    parts.push(segment);
    await createVaultFolder({ prefix: `${parts.join("/")}/`, existOk: true });
  }
}
