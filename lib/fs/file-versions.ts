import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, inArray, like } from "drizzle-orm";

import { db } from "@/lib/platform/db";
import { fileVersions } from "@/drizzle/app-schema";

/**
 * Maximum number of historical version snapshots kept per file.
 * The live S3 object is always "current"; versions capture prior states.
 */
export const MAX_VERSIONS = 5;

export interface FileVersionMeta {
  id: string;
  fileKey: string;
  contentHash: string;
  size: number;
  etag: string | null;
  authorId: string | null;
  createdAt: Date;
}

export interface FileVersionContent extends FileVersionMeta {
  content: string;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Capture a version snapshot for a file.
 *
 * - **Dedup**: skips insertion if the latest version already has the same
 *   content hash (identical content → no new version).
 * - **Prune**: after insertion, keeps only the newest {@link MAX_VERSIONS}
 *   entries for the file and deletes the rest.
 *
 * @returns The captured version metadata, or `null` if the snapshot was
 *          skipped due to dedup.
 */
export async function captureFileVersion(params: {
  fileKey: string;
  content: string;
  etag?: string | null;
  authorId?: string | null;
}): Promise<FileVersionMeta | null> {
  const { fileKey, content, etag = null, authorId = null } = params;
  const contentHash = hashContent(content);
  const size = Buffer.byteLength(content, "utf-8");

  // Dedup: skip if the latest version already has the same content hash
  const [latest] = await db
    .select({ contentHash: fileVersions.contentHash })
    .from(fileVersions)
    .where(eq(fileVersions.fileKey, fileKey))
    .orderBy(desc(fileVersions.createdAt))
    .limit(1);

  if (latest && latest.contentHash === contentHash) {
    return null;
  }

  const id = randomUUID();
  const [inserted] = await db
    .insert(fileVersions)
    .values({
      id,
      fileKey,
      content,
      contentHash,
      size,
      etag: etag ?? null,
      authorId: authorId ?? null,
    })
    .returning({
      id: fileVersions.id,
      fileKey: fileVersions.fileKey,
      contentHash: fileVersions.contentHash,
      size: fileVersions.size,
      etag: fileVersions.etag,
      authorId: fileVersions.authorId,
      createdAt: fileVersions.createdAt,
    });

  await pruneVersions(fileKey);

  return inserted ?? null;
}

/**
 * Delete oldest versions beyond {@link MAX_VERSIONS} for a given file.
 * Called automatically after every capture.
 */
async function pruneVersions(fileKey: string): Promise<void> {
  const allIds = await db
    .select({ id: fileVersions.id })
    .from(fileVersions)
    .where(eq(fileVersions.fileKey, fileKey))
    .orderBy(desc(fileVersions.createdAt));

  if (allIds.length <= MAX_VERSIONS) {
    return;
  }

  const deleteIds = allIds.slice(MAX_VERSIONS).map((row) => row.id);

  await db
    .delete(fileVersions)
    .where(
      and(
        eq(fileVersions.fileKey, fileKey),
        inArray(fileVersions.id, deleteIds),
      ),
    );
}

/**
 * List version metadata for a file (newest first), without content.
 * Used by the sidebar to render the version list.
 */
export async function getFileVersions(
  fileKey: string,
  limit: number = MAX_VERSIONS,
): Promise<FileVersionMeta[]> {
  return db
    .select({
      id: fileVersions.id,
      fileKey: fileVersions.fileKey,
      contentHash: fileVersions.contentHash,
      size: fileVersions.size,
      etag: fileVersions.etag,
      authorId: fileVersions.authorId,
      createdAt: fileVersions.createdAt,
    })
    .from(fileVersions)
    .where(eq(fileVersions.fileKey, fileKey))
    .orderBy(desc(fileVersions.createdAt))
    .limit(limit);
}

/**
 * Get a single version with its full content.
 * Used for preview rendering and rollback.
 */
export async function getFileVersionContent(
  fileKey: string,
  versionId: string,
): Promise<FileVersionContent | null> {
  const [row] = await db
    .select({
      id: fileVersions.id,
      fileKey: fileVersions.fileKey,
      content: fileVersions.content,
      contentHash: fileVersions.contentHash,
      size: fileVersions.size,
      etag: fileVersions.etag,
      authorId: fileVersions.authorId,
      createdAt: fileVersions.createdAt,
    })
    .from(fileVersions)
    .where(and(eq(fileVersions.fileKey, fileKey), eq(fileVersions.id, versionId)))
    .limit(1);

  return row ?? null;
}

/**
 * Delete all version snapshots for a single file.
 * Called on file deletion.
 */
export async function deleteFileVersions(fileKey: string): Promise<void> {
  await db.delete(fileVersions).where(eq(fileVersions.fileKey, fileKey));
}

/**
 * Delete all version snapshots under a folder prefix.
 * Called on folder deletion.
 */
export async function deleteFileVersionsByPrefix(prefix: string): Promise<void> {
  const normalized = prefix.endsWith("/") ? prefix : `${prefix}/`;
  await db
    .delete(fileVersions)
    .where(like(fileVersions.fileKey, `${normalized}%`));
}

/**
 * Rename all version snapshots from an old key to a new key.
 * Called on file move/rename.
 */
export async function renameFileVersions(
  oldKey: string,
  newKey: string,
): Promise<void> {
  await db
    .update(fileVersions)
    .set({ fileKey: newKey })
    .where(eq(fileVersions.fileKey, oldKey));
}
