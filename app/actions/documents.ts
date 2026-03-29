"use server";

import { revalidateTag, updateTag } from "next/cache";
import { normalizeFileKey } from "@/lib/fs/fs-validation";
import { getServerSession, isAllowedUser } from "@/lib/auth";
import { writeMarkdownFile } from "@/lib/fs/file-writer";
import { MANIFEST_CACHE_TAG } from "@/lib/cache/manifest-store";
import { getFileCacheTag, revalidateFileTags, setFileCacheRecord } from "@/lib/fs/file-cache";
import { getErrorMessage, getErrorStatus } from "@/lib/http/errors";

export type SaveDocumentInput = {
  key: string;
  content: string;
  ifMatchEtag?: string | null;
};

export type SaveDocumentResult =
  | { ok: true; etag?: string; lastModified: string }
  | { ok: false; reason: "conflict" | "unauthorized" | "invalid" | "unknown"; message: string };

export async function saveDocumentAction(input: SaveDocumentInput): Promise<SaveDocumentResult> {
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

  const content = typeof input.content === "string" ? input.content : "";
  const ifMatchEtag = typeof input.ifMatchEtag === "string" ? input.ifMatchEtag : undefined;

  try {
    const { etag, lastModified } = await writeMarkdownFile({ key, content, ifMatchEtag });

    await revalidateFileTags([key]);
    await setFileCacheRecord(key, {
      key,
      content,
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
        size: Buffer.byteLength(content, "utf-8"),
      });
    } catch (error) {
      console.error("Failed to hot-update manifest after save", error);
      revalidateTag(MANIFEST_CACHE_TAG, "max");
    }

    return { ok: true, etag, lastModified };
  } catch (error) {
    const status = getErrorStatus(error);
    const message = getErrorMessage(error) ?? "Failed to save document";
    if (status === 409 || status === 412) {
      return { ok: false, reason: "conflict", message };
    }
    if (status === 401 || status === 403) {
      return { ok: false, reason: "unauthorized", message };
    }
    return { ok: false, reason: "unknown", message };
  }
}
