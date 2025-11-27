import { revalidateTag } from "next/cache";

import { getRedisClient } from "@/lib/redis-client";

export const FILE_META_REDIS_PREFIX = "file-meta:";
export const FILE_META_CACHE_TAG_PREFIX = "file-meta-tag:";

export function getFileMetaCacheTag(key: string): string {
  return `${FILE_META_CACHE_TAG_PREFIX}${key}`;
}

export interface FileMeta {
  public: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileMeta(value: unknown): value is FileMeta {
  if (!isPlainObject(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.public === "boolean";
}

function buildRedisKey(key: string): string {
  return `${FILE_META_REDIS_PREFIX}${key}`;
}

export async function getFileMeta(key: string): Promise<FileMeta> {
  try {
    const redis = getRedisClient();
    const raw = await redis.get<unknown>(buildRedisKey(key));
    if (raw === null || raw === undefined) {
      return { public: false };
    }
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!isFileMeta(parsed)) {
      console.warn("Invalid file metadata in Redis; defaulting to private", { key, raw });
      return { public: false };
    }
    return parsed;
  } catch (error) {
    console.error("Failed to read file metadata from Redis", error);
    return { public: false };
  }
}

export async function setFileMeta(key: string, meta: FileMeta): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.set(buildRedisKey(key), meta);
    // Invalidate cache for this file's metadata
    revalidateTag(getFileMetaCacheTag(key), "seconds");
    return true;
  } catch (error) {
    console.error("Failed to write file metadata to Redis", error);
    return false;
  }
}

export async function deleteFileMeta(key: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.del(buildRedisKey(key));
    // Invalidate cache for this file's metadata
    revalidateTag(getFileMetaCacheTag(key), "seconds");
    return true;
  } catch (error) {
    console.error("Failed to delete file metadata from Redis", error);
    return false;
  }
}

export async function renameFileMeta(oldKey: string, newKey: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const oldKeyRedis = buildRedisKey(oldKey);
    const newKeyRedis = buildRedisKey(newKey);
    const value = await redis.get<unknown>(oldKeyRedis);
    if (value !== null && value !== undefined) {
      await redis.set(newKeyRedis, value);
      await redis.del(oldKeyRedis);
    }
    // Invalidate cache for both old and new keys
    revalidateTag(getFileMetaCacheTag(oldKey), "seconds");
    revalidateTag(getFileMetaCacheTag(newKey), "seconds");
    return true;
  } catch (error) {
    console.error("Failed to rename file metadata in Redis", error);
    return false;
  }
}
