import { GetObjectCommand } from "@aws-sdk/client-s3";
import { cacheLife, cacheTag } from "next/cache";

import { getRedisClient } from "@/lib/redis-client";
import { FILE_TREE_MANIFEST_FILENAME, validateFileTreeManifest, type FileTreeManifest } from "@/lib/file-tree-manifest";
import { getBucket, getS3Client } from "@/lib/s3";
import { s3BodyToString } from "@/lib/s3-body";

export const MANIFEST_REDIS_KEY = "file-tree:manifest";
export const MANIFEST_CACHE_TAG = "file-tree-manifest";

export interface RedisManifestValue {
  etag?: string;
  body: string;
  metadata: FileTreeManifest["metadata"];
  updatedAt: string;
}

export interface ManifestRecord {
  manifest: FileTreeManifest;
  body: string;
  etag?: string;
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
  if ("etag" in value && typeof value.etag !== "string") {
    return false;
  }
  return true;
}

function sanitizeEtag(etag: string | undefined): string | undefined {
  if (!etag) {
    return undefined;
  }
  return etag.replace(/"/g, "");
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
      updatedAt: parsed.updatedAt,
      etag: sanitizeEtag(parsed.etag),
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
    const parsed = JSON.parse(body);
    const validation = validateFileTreeManifest(parsed);
    if (!validation.success) {
      throw new Error(`Invalid manifest schema from S3: ${validation.errors.join(", ")}`);
    }
    const manifest = validation.manifest;
    return {
      manifest,
      body: JSON.stringify(manifest),
      etag: sanitizeEtag(response.ETag ?? undefined),
      updatedAt: new Date().toISOString(),
      source: "s3",
    };
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
    try {
      const parsed = JSON.parse(fromRedis.body);
      const validation = validateFileTreeManifest(parsed);
      if (!validation.success) {
        console.error("Redis manifest invalid, falling back to S3", validation.errors);
      } else {
        return {
          manifest: validation.manifest,
          body: JSON.stringify(validation.manifest),
          etag: sanitizeEtag(fromRedis.etag),
          updatedAt: fromRedis.updatedAt,
          source: "redis",
        };
      }
    } catch (error) {
      console.error("Redis manifest parse error, falling back to S3", error);
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
      updatedAt: fromS3.updatedAt,
    });
  } catch (error) {
    console.error("Failed to seed manifest into Redis", error);
  }

  return fromS3;
}
