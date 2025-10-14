import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), ".cache", "file-tree");
const CACHE_FILE = path.join(CACHE_DIR, "manifest.json");

type CachedManifestPayload = {
  etag?: string;
  body: string;
};

function isCachedManifestPayload(value: unknown): value is CachedManifestPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const cast = value as { etag?: unknown; body?: unknown };
  return typeof cast.body === "string" && (typeof cast.etag === "string" || typeof cast.etag === "undefined");
}

export async function writeManifestCache(payload: CachedManifestPayload): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const serialized = JSON.stringify(payload);
  await writeFile(CACHE_FILE, serialized, "utf8");
}

export async function readManifestCache(): Promise<CachedManifestPayload | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (isCachedManifestPayload(parsed)) {
      return parsed;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.warn("Failed to read cached manifest", error);
    }
  }
  return null;
}

export const manifestCachePaths = {
  directory: CACHE_DIR,
  file: CACHE_FILE,
};
