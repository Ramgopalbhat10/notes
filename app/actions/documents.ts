"use server";

import { revalidateTag, updateTag } from "next/cache";
import { normalizeFileKey } from "@/lib/fs-validation";
import { getServerSession, isAllowedUser } from "@/lib/auth";
import { writeMarkdownFile } from "@/lib/file-writer";
import { MANIFEST_CACHE_TAG } from "@/lib/manifest-store";
import { getFileCacheTag, revalidateFileTags, setFileCacheRecord } from "@/lib/file-cache";

export type SaveDocumentInput = {
  key: string;
  content: string;
  ifMatchEtag?: string | null;
};

export type SaveDocumentResult =
  | { ok: true; etag?: string; lastModified: string }
  | { ok: false; reason: "conflict" | "unauthorized" | "invalid" | "unknown"; message: string };

function getStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const maybeStatus = (error as { status?: number }).status;
    if (typeof maybeStatus === "number") {
      return maybeStatus;
    }
    const metadataStatus = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (typeof metadataStatus === "number") {
      return metadataStatus;
    }
  }
  return undefined;
}

function getMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return undefined;
}

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
    revalidateTag(MANIFEST_CACHE_TAG, "max");

    return { ok: true, etag, lastModified };
  } catch (error) {
    const status = getStatus(error);
    const message = getMessage(error) ?? "Failed to save document";
    if (status === 409 || status === 412) {
      return { ok: false, reason: "conflict", message };
    }
    if (status === 401 || status === 403) {
      return { ok: false, reason: "unauthorized", message };
    }
    return { ok: false, reason: "unknown", message };
  }
}
