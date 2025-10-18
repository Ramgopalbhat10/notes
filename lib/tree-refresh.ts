import {
  generateFileTreeManifest,
  serializeFileTreeManifest,
  uploadFileTreeManifest,
} from "@/lib/file-tree-builder";
import type { FileTreeManifest } from "@/lib/file-tree-manifest";
import {
  MANIFEST_CACHE_TAG,
  writeManifestToRedis,
  type RedisManifestValue,
} from "@/lib/manifest-store";
import { revalidateTag } from "next/cache";

export interface RefreshResult {
  manifest: FileTreeManifest;
  payload: string;
  etag?: string;
  updatedAt: string;
}

export async function refreshFileTree(): Promise<RefreshResult> {
  const manifest = await generateFileTreeManifest();
  const payload = serializeFileTreeManifest(manifest);
  const { etag } = await uploadFileTreeManifest(manifest);
  const updatedAt = new Date().toISOString();

  const redisValue: RedisManifestValue = {
    body: payload,
    metadata: manifest.metadata,
    etag,
    updatedAt,
  };

  await writeManifestToRedis(redisValue);
  await revalidateTag(MANIFEST_CACHE_TAG);

  return {
    manifest,
    payload,
    etag,
    updatedAt,
  };
}
