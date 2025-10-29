import { GetObjectCommand } from "@aws-sdk/client-s3";
import { unstable_cache, revalidateTag } from "next/cache";

import { applyVaultPrefix, getBucket, getS3Client, stripVaultPrefix } from "@/lib/s3";
import { s3BodyToString } from "@/lib/s3-body";
import { getRedisClient } from "@/lib/redis-client";

export const FILE_CACHE_TAG_PREFIX = "file:";
const FILE_CACHE_KEY_PREFIX = "file-cache:";
const REDIS_FILE_CACHE_PREFIX = "file-cache:v1:";

const cacheMissTracker = new Set<string>();

export interface CachedFileRecord {
  key: string;
  content: string;
  etag?: string;
  lastModified?: string;
  fetchedAt: string;
  cacheStatus: "hit" | "miss";
}

// Value stored in Redis for file cache entries (key is implicit in the Redis key)
interface RedisFileCacheValue {
  content: string;
  etag?: string;
  lastModified?: string;
  fetchedAt?: string;
}

function isRedisFileCacheValue(value: unknown): value is RedisFileCacheValue {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.content !== "string") {
    return false;
  }
  if (obj.etag !== undefined && typeof obj.etag !== "string") {
    return false;
  }
  if (obj.lastModified !== undefined && typeof obj.lastModified !== "string") {
    return false;
  }
  if (obj.fetchedAt !== undefined && typeof obj.fetchedAt !== "string") {
    return false;
  }
  return true;
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

function buildRedisKey(key: string): string {
  return `${REDIS_FILE_CACHE_PREFIX}${key}`;
}

async function readFromRedis(
  key: string,
): Promise<Omit<CachedFileRecord, "cacheStatus"> | null> {
  try {
    const redis = getRedisClient();
    const value = await redis.get<unknown>(buildRedisKey(key));
    if (value == null) {
      return null;
    }
    const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
    if (isRedisFileCacheValue(parsed)) {
      const { content, etag, lastModified, fetchedAt } = parsed;
      return {
        key,
        content,
        etag,
        lastModified,
        fetchedAt: fetchedAt ?? new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function writeToRedis(key: string, record: Omit<CachedFileRecord, "cacheStatus">): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(buildRedisKey(key), record);
  } catch {
    // ignore redis write failures
  }
}

export async function setFileCacheRecord(key: string, record: Omit<CachedFileRecord, "cacheStatus">): Promise<void> {
  await writeToRedis(key, record);
}

export async function getCachedFile(key: string): Promise<CachedFileRecord> {
  const cacheKey = buildCacheKey(key);
  const tag = buildCacheTag(key);

  const loader = unstable_cache(
    async () => {
      const fromRedis = await readFromRedis(key);
      if (fromRedis) {
        cacheMissTracker.add(cacheKey);
        return fromRedis;
      }
      const result = await fetchFileFromS3(key);
      await writeToRedis(key, result);
      cacheMissTracker.add(cacheKey);
      return result;
    },
    [cacheKey],
    {
      tags: [tag],
      revalidate: false,
    },
  );

  const result = await loader();
  const miss = cacheMissTracker.delete(cacheKey);
  return {
    ...result,
    cacheStatus: miss ? "miss" : "hit",
  };
}

export async function revalidateFileTags(keys: string[]): Promise<void> {
  const normalized = keys.map((key) => key.trim()).filter((key) => key.length > 0);
  if (normalized.length === 0) {
    return;
  }
  const redis = getRedisClient();
  for (const key of normalized) {
    try {
      await redis.del(buildRedisKey(key));
    } catch {
      // ignore redis delete failures
    }
    revalidateTag(buildCacheTag(key));
  }
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
