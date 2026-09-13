import { HeadObjectCommand } from "@aws-sdk/client-s3";

import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/fs/s3";
import { getErrorStatus, statusError } from "@/lib/http/errors";

export async function ensureMatchingEtag({
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
    throw statusError("ETag mismatch", 409);
  }
}

export async function objectExists(fullKey: string): Promise<boolean> {
  const client = getS3Client();
  const bucket = getBucket();
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: fullKey,
      }),
    );
    return true;
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 404) {
      return false;
    }
    throw error;
  }
}

export function encodeCopySource(bucket: string, key: string): string {
  return encodeURIComponent(`${bucket}/${key}`).replace(/%2F/g, "/");
}
