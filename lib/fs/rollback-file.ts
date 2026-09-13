import { getFileVersionContent, getFileVersions, type FileVersionMeta } from "@/lib/fs/file-versions";
import { saveMarkdownFile } from "@/lib/fs/save-markdown";
import { statusError } from "@/lib/http/errors";

export async function listFileVersionSnapshots(key: string): Promise<FileVersionMeta[]> {
  return getFileVersions(key);
}

export async function rollbackFileToVersion({
  key,
  versionId,
  authorId = null,
}: {
  key: string;
  versionId: string;
  authorId?: string | null;
}): Promise<{ content: string; etag?: string; lastModified: string }> {
  const targetVersion = await getFileVersionContent(key, versionId);
  if (!targetVersion) {
    throw statusError("Version not found", 404);
  }

  const saved = await saveMarkdownFile({
    key,
    content: targetVersion.content,
    authorId,
  });

  return {
    content: targetVersion.content,
    etag: saved.etag,
    lastModified: saved.lastModified,
  };
}
