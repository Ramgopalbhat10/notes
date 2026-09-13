import { revalidateTag, updateTag } from "next/cache";

import { MANIFEST_CACHE_TAG } from "@/lib/cache/manifest-store";
import {
  getFileCacheTag,
  readFileContent,
  revalidateFileTags,
  setFileCacheRecord,
} from "@/lib/fs/file-cache";
import { writeMarkdownFile } from "@/lib/fs/file-writer";
import { captureFileVersion } from "@/lib/fs/file-versions";

export type SaveMarkdownFileParams = {
  key: string;
  content: string;
  ifMatchEtag?: string;
  authorId?: string | null;
};

export type SaveMarkdownFileResult = {
  etag?: string;
  lastModified: string;
  created: boolean;
};

export async function saveMarkdownFile({
  key,
  content,
  ifMatchEtag,
  authorId = null,
}: SaveMarkdownFileParams): Promise<SaveMarkdownFileResult> {
  let previousContent: string | null = null;
  let previousEtag: string | null = null;
  try {
    const previous = await readFileContent(key);
    if (previous) {
      previousContent = previous.content;
      previousEtag = previous.etag ?? null;
    }
  } catch {
    // Non-critical: don't block the save if we can't read the previous content
  }

  const { etag: newEtag, lastModified } = await writeMarkdownFile({ key, content, ifMatchEtag });

  await revalidateFileTags([key]);
  await setFileCacheRecord(key, {
    key,
    content,
    etag: newEtag,
    lastModified,
    fetchedAt: new Date().toISOString(),
  });
  updateTag(getFileCacheTag(key));

  try {
    const { addOrUpdateFile } = await import("@/lib/manifest-updater");
    await addOrUpdateFile({
      key,
      etag: newEtag,
      lastModified,
      size: Buffer.byteLength(content, "utf-8"),
    });
  } catch (error) {
    console.error("Failed to hot-update manifest after save", error);
    revalidateTag(MANIFEST_CACHE_TAG, "max");
  }

  if (previousContent !== null && previousContent !== content) {
    try {
      await captureFileVersion({
        fileKey: key,
        content: previousContent,
        etag: previousEtag,
        authorId,
      });
    } catch (error) {
      console.error("Failed to capture file version", error);
    }
  }

  return {
    etag: newEtag,
    lastModified,
    created: previousContent === null,
  };
}
