"use server";

import { normalizeFileKey } from "@/lib/fs/fs-validation";
import { getServerSession, isAllowedUser } from "@/lib/auth";
import { getFileVersionContent } from "@/lib/fs/file-versions";
import { listFileVersionSnapshots, rollbackFileToVersion } from "@/lib/fs/rollback-file";
import { getErrorStatus } from "@/lib/http/errors";

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
    const versions = await listFileVersionSnapshots(key);
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
    const result = await rollbackFileToVersion({ key, versionId, authorId });
    return { ok: true, content: result.content, etag: result.etag, lastModified: result.lastModified };
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 404) {
      return { ok: false, reason: "not_found", message: "Version not found" };
    }
    return { ok: false, reason: "unknown", message: "Failed to rollback to version" };
  }
}
