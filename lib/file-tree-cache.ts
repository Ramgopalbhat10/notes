/**
 * In-memory cache for Cloudflare Workers environment.
 * For production, consider using Cloudflare KV or R2 for persistent caching.
 */

type CachedManifestPayload = {
  etag?: string;
  body: string;
};

// Simple in-memory cache (resets on worker restart)
let memoryCache: CachedManifestPayload | null = null;

export async function writeManifestCache(payload: CachedManifestPayload): Promise<void> {
  memoryCache = payload;
}

export async function readManifestCache(): Promise<CachedManifestPayload | null> {
  return memoryCache;
}

export const manifestCachePaths = {
  directory: "(in-memory)",
  file: "(in-memory)",
};
