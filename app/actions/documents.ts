"use server";

import { normalizeFileKey } from "@/lib/fs/fs-validation";
import { getServerSession, isAllowedUser } from "@/lib/auth";
import { saveMarkdownFile } from "@/lib/fs/save-markdown";
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
  const authorId =
    session.user && typeof session.user === "object" && "id" in session.user && typeof session.user.id === "string"
      ? session.user.id
      : null;

  try {
    const { etag, lastModified } = await saveMarkdownFile({ key, content, ifMatchEtag, authorId });
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
