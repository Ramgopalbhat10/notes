import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { applyVaultPrefix, getBucket, getS3Client } from "@/lib/s3";
import { normalizeEtag } from "@/lib/etag";

export interface WriteFileParams {
  key: string;
  content: string;
  ifMatchEtag?: string;
}

export interface WriteFileResult {
  etag?: string;
  lastModified: string;
}

export async function writeMarkdownFile({ key, content, ifMatchEtag }: WriteFileParams): Promise<WriteFileResult> {
  const bucket = getBucket();
  const client = getS3Client();
  const fullKey = applyVaultPrefix(key);

  const putResult = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      Body: content,
      ContentType: "text/markdown; charset=utf-8",
      ...(ifMatchEtag ? { IfMatch: ifMatchEtag } : {}),
    }),
  );

  const head = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: fullKey,
    }),
  );

  const newEtag = normalizeEtag(putResult.ETag ?? head.ETag ?? null) ?? undefined;
  const lastModifiedIso = head.LastModified ? head.LastModified.toISOString() : new Date().toISOString();

  return {
    etag: newEtag,
    lastModified: lastModifiedIso,
  };
}
