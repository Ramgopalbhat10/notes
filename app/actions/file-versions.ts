"use server";

import { revalidateTag, updateTag } from "next/cache";

import { normalizeFileKey } from "@/lib/fs/fs-validation";
import { getServerSession, isAllowedUser } from "@/lib/auth";
import { writeMarkdownFile } from "@/lib/fs/file-writer";
import {
  captureFileVersion,
  getFileVersionContent,
  getFileVersions,
} from "@/lib/fs/file-versions";
import {
  getFileCacheTag,
  readFileContent,
  revalidateFileTags,
  setFileCacheRecord,
} from "@/lib/fs/file-cache";
import { MANIFEST_CACHE_TAG } from "@/lib/cache/manifest-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileVersionListItem = {
  id: string;
  createdAt: string;
  size: number;
  contentHash: string;
};

export type GetFileVersionsResult =
  | { ok: true; versions: FileVersionListItem[] }
  | { ok: false; reason: "unauthorized" | "invalid" | "unknown"; message: string };

export type GetVersionContentResult =
  | { ok: true; content: string; createdAt: string; size: number }
  | {
      ok: false;
      reason: "unauthorized" | "invalid" | "not_found" | "unknown";
      message: string;
    };

export type RollbackVersionResult =
  | { ok: true; content: string; etag?: string; lastModified: string }
  | {
      ok: false;
      reason: "unauthorized" | "invalid" | "not_found" | "unknown";
      message: string;
    };

// ---------------------------------------------------------------------------
// Auth + validation helpers
// ---------------------------------------------------------------------------

function getSessionUserId(
  session: Awaited<ReturnType<typeof getServerSession>>,
): string | null {
  const user = session?.user;
  if (user && typeof user === "object" && "id" in user) {
    const id = (user as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * List the latest version snapshots (metadata only, no content) for a file.
 * The sidebar uses this to render the version list.
 */
export async function getFileVersionsAction(input: {
  key: string;
}): Promise<GetFileVersionsResult> {
  const session = await getServerSession();
  if (!session || !isAllowedUser(session)) {
    return { ok: false, reason: "unauthorized", message: "Unauthorized" };
  }

  let key: string;
  try {
    key = normalizeFileKey(input.key);
  } catch {
    return { ok: false, reason: "invalid", message: "Invalid file key" };
  }

  try {
    const versions = await getFileVersions(key);
    return {
      ok: true,
      versions: versions.map((v) => ({
        id: v.id,
        createdAt: v.createdAt.toISOString(),
        size: v.size,
        contentHash: v.contentHash,
      })),
    };
  } catch {
    return { ok: false, reason: "unknown", message: "Failed to fetch versions" };
  }
}

/**
 * Get the full content of a single version — used to render a read-only
 * preview in the main view.
 */
export async function getFileVersionContentAction(input: {
  key: string;
  versionId: string;
}): Promise<GetVersionContentResult> {
  const session = await getServerSession();
  if (!session || !isAllowedUser(session)) {
    return { ok: false, reason: "unauthorized", message: "Unauthorized" };
  }

  let key: string;
  try {
    key = normalizeFileKey(input.key);
  } catch {
    return { ok: false, reason: "invalid", message: "Invalid file key" };
  }

  const versionId = typeof input.versionId === "string" ? input.versionId.trim() : "";
  if (!versionId) {
    return { ok: false, reason: "invalid", message: "Version ID is required" };
  }

  try {
    const version = await getFileVersionContent(key, versionId);
    if (!version) {
      return { ok: false, reason: "not_found", message: "Version not found" };
    }
    return {
      ok: true,
      content: version.content,
      createdAt: version.createdAt.toISOString(),
      size: version.size,
    };
  } catch {
    return { ok: false, reason: "unknown", message: "Failed to fetch version content" };
  }
}

/**
 * Rollback a file to a previous version.
 *
 * 1. Read the target version's content from Turso.
 * 2. Fetch the current live content (from Redis/S3) and capture it as a
 *    version snapshot — so the rollback itself is reversible and the current
 *    state is never lost.
 * 3. Overwrite the S3 object with the target version's content (no `IfMatch`
 *    — forced overwrite).
 * 4. Revalidate caches and update the manifest (same as a normal save).
 *
 * @returns The new etag/lastModified of the rolled-back file.
 */
export async function rollbackToVersionAction(input: {
  key: string;
  versionId: string;
}): Promise<RollbackVersionResult> {
  const session = await getServerSession();
  if (!session || !isAllowedUser(session)) {
    return { ok: false, reason: "unauthorized", message: "Unauthorized" };
  }

  let key: string;
  try {
    key = normalizeFileKey(input.key);
  } catch {
    return { ok: false, reason: "invalid", message: "Invalid file key" };
  }

  const versionId = typeof input.versionId === "string" ? input.versionId.trim() : "";
  if (!versionId) {
    return { ok: false, reason: "invalid", message: "Version ID is required" };
  }

  const authorId = getSessionUserId(session);

  try {
    // 1. Read the target version content
    const targetVersion = await getFileVersionContent(key, versionId);
    if (!targetVersion) {
      return { ok: false, reason: "not_found", message: "Version not found" };
    }

    // 2. Capture the current live content before overwriting (reversible)
    const current = await readFileContent(key);
    if (current && current.content !== targetVersion.content) {
      await captureFileVersion({
        fileKey: key,
        content: current.content,
        etag: current.etag ?? null,
        authorId,
      });
    }

    // 3. Overwrite S3 with the target version's content (forced, no IfMatch)
    const { etag, lastModified } = await writeMarkdownFile({
      key,
      content: targetVersion.content,
    });

    // 4. Revalidate caches + update manifest (same as saveDocumentAction)
    await revalidateFileTags([key]);
    await setFileCacheRecord(key, {
      key,
      content: targetVersion.content,
      etag,
      lastModified,
      fetchedAt: new Date().toISOString(),
    });

    updateTag(getFileCacheTag(key));
    try {
      const { addOrUpdateFile } = await import("@/lib/manifest-updater");
      await addOrUpdateFile({
        key,
        etag,
        lastModified,
        size: Buffer.byteLength(targetVersion.content, "utf-8"),
      });
    } catch (error) {
      console.error("Failed to hot-update manifest after rollback", error);
      revalidateTag(MANIFEST_CACHE_TAG, "max");
    }

    return { ok: true, content: targetVersion.content, etag, lastModified };
  } catch {
    return { ok: false, reason: "unknown", message: "Failed to rollback to version" };
  }
}
