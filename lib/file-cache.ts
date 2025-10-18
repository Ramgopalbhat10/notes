import { GetObjectCommand } from "@aws-sdk/client-s3";
import { unstable_cache, revalidateTag } from "next/cache";

import { applyVaultPrefix, getBucket, getS3Client, stripVaultPrefix } from "@/lib/s3";
import { s3BodyToString } from "@/lib/s3-body";

export const FILE_CACHE_TAG_PREFIX = "file:";
const FILE_CACHE_KEY_PREFIX = "file-cache:";
const DEFAULT_REVALIDATE_SECONDS = 300;

const cacheMissTracker = new Set<string>();

export interface CachedFileRecord {
  key: string;
  content: string;
  etag?: string;
  lastModified?: string;
  fetchedAt: string;
  cacheStatus: "hit" | "miss";
}

function sanitizeEtag(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.replace(/"/g, "");
}

async function fetchFileFromS3(key: string): Promise<Omit<CachedFileRecord, "cacheStatus">> {
  const client = getS3Client();
  const bucket = getBucket();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: applyVaultPrefix(key),
    }),
  );

  const content = await s3BodyToString(response.Body);
  const etag = sanitizeEtag(response.ETag ?? undefined);
  const lastModified = response.LastModified?.toISOString();

  return {
    key,
    content,
    etag,
    lastModified,
    fetchedAt: new Date().toISOString(),
  };
}

function buildCacheTag(key: string): string {
  return `${FILE_CACHE_TAG_PREFIX}${key}`;
}

function buildCacheKey(key: string): string {
  return `${FILE_CACHE_KEY_PREFIX}${key}`;
}

export async function getCachedFile(key: string): Promise<CachedFileRecord> {
  const cacheKey = buildCacheKey(key);
  const tag = buildCacheTag(key);

  const loader = unstable_cache(
    async () => {
      const result = await fetchFileFromS3(key);
      cacheMissTracker.add(cacheKey);
      return result;
    },
    [cacheKey],
    {
      tags: [tag],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
  );

  const result = await loader();
  const miss = cacheMissTracker.delete(cacheKey);
  return {
    ...result,
    cacheStatus: miss ? "miss" : "hit",
  };
}

export function revalidateFileTags(keys: string[]): void {
  keys
    .map((key) => key.trim())
    .filter((key): key is string => key.length > 0)
    .forEach((key) => {
      revalidateTag(buildCacheTag(key));
    });
}

export function revalidateFolderTag(prefix: string): void {
  const normalized = prefix.endsWith("/") ? prefix : `${prefix}/`;
  revalidateTag(buildCacheTag(normalized));
}

export function toRelativeKeys(keys: string[]): string[] {
  return keys
    .map((key) => stripVaultPrefix(key))
    .filter((relative): relative is string => Boolean(relative) && !relative.endsWith("/"));
}
