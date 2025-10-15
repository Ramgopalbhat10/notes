import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

const DEFAULT_CACHE_ROOT =
  process.env.NODE_ENV === "production" ? path.join(tmpdir(), "file-tree-cache") : path.join(process.cwd(), ".cache");
const CACHE_ROOT = process.env.FILE_TREE_CACHE_ROOT ? path.resolve(process.env.FILE_TREE_CACHE_ROOT) : DEFAULT_CACHE_ROOT;

const CACHE_DIR = path.join(CACHE_ROOT, "file-tree");
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
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const serialized = JSON.stringify(payload);
    await writeFile(CACHE_FILE, serialized, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "EROFS") {
      console.warn("Skipping manifest cache write: read-only filesystem", error);
      return;
    }
    console.warn("Failed to write manifest cache", error);
  }
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
