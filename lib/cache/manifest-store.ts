import { GetObjectCommand } from "@aws-sdk/client-s3";
import { cacheLife, cacheTag } from "next/cache";

import { normalizeEtag } from "@/lib/etag";
import { getRedisClient } from "@/lib/cache/redis-client";
import { buildSlugToIdMap } from "@/lib/content/slug-map";
import { FILE_TREE_MANIFEST_FILENAME, validateFileTreeManifest, type FileTreeManifest } from "@/lib/file-tree-manifest";
import { getBucket, getS3Client } from "@/lib/fs/s3";
import { s3BodyToString } from "@/lib/fs/s3-body";

export const MANIFEST_REDIS_KEY = "file-tree:manifest";
export const MANIFEST_CACHE_TAG = "file-tree-manifest";

export interface RedisManifestValue {
  etag?: string;
  body: string;
  metadata: FileTreeManifest["metadata"];
  slugToId?: Record<string, string>;
  updatedAt: string;
}

export interface ManifestRecord {
  manifest: FileTreeManifest;
  body: string;
  etag?: string;
  slugToId: Record<string, string>;
  updatedAt: string;
  source: "redis" | "s3";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRedisManifestValue(value: unknown): value is RedisManifestValue {
  if (!isPlainObject(value)) {
    return false;
  }
  if (typeof value.body !== "string" || value.body.length === 0) {
    return false;
  }
  if (!isPlainObject(value.metadata)) {
    return false;
  }
  if (typeof value.updatedAt !== "string" || Number.isNaN(Date.parse(value.updatedAt))) {
    return false;
  }
  if (
    "slugToId" in value
    && (!isPlainObject(value.slugToId)
      || Object.values(value.slugToId).some((entry) => typeof entry !== "string"))
  ) {
    return false;
  }
  if ("etag" in value && typeof value.etag !== "string") {
    return false;
  }
  return true;
}

function getManifestEtag(manifest: FileTreeManifest, fallback?: string): string | undefined {
  return manifest.metadata.checksum || normalizeEtag(fallback) || undefined;
}

function buildManifestRecord(params: {
  body: string;
  etag?: string;
  slugToId?: Record<string, string>;
  source: ManifestRecord["source"];
  updatedAt: string;
}): ManifestRecord | null {
  try {
    const parsed = JSON.parse(params.body);
    const validation = validateFileTreeManifest(parsed);
    if (!validation.success) {
      console.error("Manifest invalid", validation.errors);
      return null;
    }

    const manifest = validation.manifest;
    const slugToId = params.slugToId && Object.keys(params.slugToId).length > 0
      ? params.slugToId
      : buildSlugToIdMap(manifest);

    return {
      manifest,
      body: JSON.stringify(manifest),
      etag: getManifestEtag(manifest, params.etag),
      slugToId,
      updatedAt: params.updatedAt,
      source: params.source,
    };
  } catch (error) {
    console.error("Manifest parse error", error);
    return null;
  }
}

export async function readManifestFromRedis(): Promise<RedisManifestValue | null> {
  try {
    const redis = getRedisClient();
    const value = await redis.get<RedisManifestValue | string | null>(MANIFEST_REDIS_KEY);
    if (!value) {
      return null;
    }

    const parsed = typeof value === "string" ? safeParseRedisValue(value) : value;
    if (!parsed || !isRedisManifestValue(parsed)) {
      console.warn("Redis manifest value has unexpected shape; ignoring.");
      return null;
    }

    return {
      body: parsed.body,
      metadata: parsed.metadata,
      slugToId: parsed.slugToId,
      updatedAt: parsed.updatedAt,
      etag: normalizeEtag(parsed.etag) ?? undefined,
    };
  } catch (error) {
    console.error("Failed to read manifest from Redis", error);
    return null;
  }
}

function safeParseRedisValue(value: string): RedisManifestValue | null {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("Failed to parse Redis manifest value as JSON", error);
    return null;
  }
}

async function fetchManifestFromS3(): Promise<ManifestRecord | null> {
  try {
    const client = getS3Client();
    const bucket = getBucket();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: FILE_TREE_MANIFEST_FILENAME,
      }),
    );
    const body = await s3BodyToString(response.Body);
    return buildManifestRecord({
      body,
      etag: normalizeEtag(response.ETag ?? undefined) ?? undefined,
      source: "s3",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to read manifest from S3", error);
    return null;
  }
}

export async function writeManifestToRedis(value: RedisManifestValue): Promise<void> {
  const redis = getRedisClient();
  await redis.set(MANIFEST_REDIS_KEY, {
    body: value.body,
    metadata: value.metadata,
    slugToId: value.slugToId,
    updatedAt: value.updatedAt,
    etag: value.etag,
  });
}

export async function loadLatestManifest(): Promise<ManifestRecord | null> {
  "use cache";

  cacheTag(MANIFEST_CACHE_TAG);
  cacheLife("minutes");

  const fromRedis = await readManifestFromRedis();
  if (fromRedis) {
    const redisRecord = buildManifestRecord({
      body: fromRedis.body,
      etag: fromRedis.etag,
      slugToId: fromRedis.slugToId,
      source: "redis",
      updatedAt: fromRedis.updatedAt,
    });
    if (redisRecord) {
      return redisRecord;
    }
  }

  const fromS3 = await fetchManifestFromS3();
  if (!fromS3) {
    return null;
  }

  try {
    await writeManifestToRedis({
      body: fromS3.body,
      metadata: fromS3.manifest.metadata,
      etag: fromS3.etag,
      slugToId: fromS3.slugToId,
      updatedAt: fromS3.updatedAt,
    });
  } catch (error) {
    console.error("Failed to seed manifest into Redis", error);
  }

  return fromS3;
}
