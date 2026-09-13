import { jsonSchema, tool, type Tool } from "ai";

import { clampText } from "@/lib/ai/text-utils";
import { redactSecrets, sanitizeContext } from "@/lib/ai/redact";
import { coerceFileKey, coerceFolderPrefix, isFilePathHint, isVaultRoot, utf8Bytes } from "@/lib/ai/vault-path";
import { loadLatestManifest } from "@/lib/cache/manifest-store";
import { isFolderNode } from "@/lib/file-tree-manifest";
import { createVaultFolder, ensureAncestorFolders } from "@/lib/fs/create-folder";
import { deleteMarkdownFile } from "@/lib/fs/delete-file";
import { deleteVaultFolder } from "@/lib/fs/delete-folder";
import { readFileContent } from "@/lib/fs/file-cache";
import { moveVaultNode } from "@/lib/fs/move-node";
import { listFileVersionSnapshots, rollbackFileToVersion } from "@/lib/fs/rollback-file";
import { saveMarkdownFile } from "@/lib/fs/save-markdown";
import { getErrorMessage, getErrorStatus } from "@/lib/http/errors";

export const MAX_WRITE_BYTES = 256 * 1024;
export const MAX_READ_CHARS = 64 * 1024;
export const MAX_DIR_ENTRIES = 200;

export type VaultToolContext = {
  authorId: string | null;
};

type ToolFailure = {
  ok: false;
  error: "invalid_path" | "not_found" | "exists" | "edit_mismatch" | "too_large" | "not_confirmed" | "write_failed";
  message: string;
  path?: string;
  matches?: number;
};

function fail(error: ToolFailure["error"], message: string, extra?: { path?: string; matches?: number }): ToolFailure {
  return { ok: false, error, message, ...extra };
}

function mapCaughtError(error: unknown, path?: string): ToolFailure {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error) ?? "Request failed";
  if (status === 404) {
    return fail("not_found", message, { path });
  }
  if (status === 409) {
    return fail("exists", message, { path });
  }
  if (status === 400) {
    const lower = message.toLowerCase();
    if (lower.includes("empty") || lower.includes("relative") || lower.includes("..") || lower.includes("markdown")) {
      return fail("invalid_path", message, { path });
    }
    return fail("write_failed", message, { path });
  }
  return fail("write_failed", message, { path });
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let index = 0;
  while (index < haystack.length) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) {
      break;
    }
    count += 1;
    index = found + needle.length;
  }
  return count;
}

export function createVaultTools(context: VaultToolContext): Record<string, Tool> {
  return {
    list_dir: tool({
      description:
        "List files and folders in a vault directory. Omit path or pass an empty string for the vault root. Returns at most 200 children.",
      inputSchema: jsonSchema<{ path?: string }>({
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Vault-relative folder path. Empty or omitted lists the vault root.",
          },
        },
      }),
      execute: async ({ path }) => {
        try {
          const manifestRecord = await loadLatestManifest();
          if (!manifestRecord) {
            return fail("write_failed", "Vault file tree is unavailable");
          }
          const manifest = manifestRecord.manifest;
          const nodeById = new Map(manifest.nodes.map((node) => [node.id, node]));
          const root = isVaultRoot(path ?? "");
          const folderId = root ? null : coerceFolderPrefix(path ?? "");
          const folderNode = folderId ? nodeById.get(folderId) : null;
          if (folderId && !folderNode) {
            return fail("not_found", "Folder not found", { path: folderId });
          }
          if (folderNode && !isFolderNode(folderNode)) {
            return fail("invalid_path", "Path is a file, not a folder", { path: folderId ?? undefined });
          }
          const childIds = folderNode && isFolderNode(folderNode) ? folderNode.childrenIds : manifest.rootIds;
          const entries = childIds
            .map((id) => nodeById.get(id))
            .filter((node): node is NonNullable<typeof node> => Boolean(node))
            .map((node) => ({ name: node.name, path: node.path, type: node.type }));
          const truncated = entries.length > MAX_DIR_ENTRIES;
          return {
            ok: true as const,
            path: folderId ?? "",
            truncated,
            entries: entries.slice(0, MAX_DIR_ENTRIES),
          };
        } catch (error) {
          return mapCaughtError(error, path);
        }
      },
    }),

    read_file: tool({
      description: "Read a markdown file from the vault. Content may be truncated; if truncated is true, do not fully rewrite the file.",
      inputSchema: jsonSchema<{ path: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "Vault-relative markdown path" },
        },
        required: ["path"],
      }),
      execute: async ({ path }) => {
        try {
          const key = coerceFileKey(path);
          const record = await readFileContent(key);
          if (!record) {
            return fail("not_found", "File not found", { path: key });
          }
          const prepared = redactSecrets(sanitizeContext(record.content));
          const { text, truncated } = clampText(prepared, MAX_READ_CHARS, { trailingEllipsis: true });
          return {
            ok: true as const,
            path: key,
            content: text,
            etag: record.etag ?? null,
            truncated,
          };
        } catch (error) {
          return mapCaughtError(error, path);
        }
      },
    }),

    write_file: tool({
      description:
        "Create or fully replace a markdown file. Use edit_file for partial changes. Creates missing parent folders. Max 256 KiB.",
      inputSchema: jsonSchema<{ path: string; content: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "Vault-relative markdown path" },
          content: { type: "string", description: "Full markdown body" },
        },
        required: ["path", "content"],
      }),
      execute: async ({ path, content }) => {
        try {
          const key = coerceFileKey(path);
          if (utf8Bytes(content) > MAX_WRITE_BYTES) {
            return fail("too_large", "File content exceeds 256 KiB", { path: key });
          }
          await ensureAncestorFolders(key);
          const saved = await saveMarkdownFile({ key, content, authorId: context.authorId });
          return {
            ok: true as const,
            path: key,
            created: saved.created,
            overwritten: !saved.created,
            etag: saved.etag ?? null,
          };
        } catch (error) {
          return mapCaughtError(error, path);
        }
      },
    }),

    edit_file: tool({
      description:
        "Replace a unique exact snippet in an existing markdown file. old_text must appear exactly once. Prefer this over write_file for edits.",
      inputSchema: jsonSchema<{ path: string; old_text: string; new_text: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "Vault-relative markdown path" },
          old_text: { type: "string", description: "Exact snippet to replace; must match once" },
          new_text: { type: "string", description: "Replacement snippet" },
        },
        required: ["path", "old_text", "new_text"],
      }),
      execute: async ({ path, old_text, new_text }) => {
        try {
          const key = coerceFileKey(path);
          const record = await readFileContent(key);
          if (!record) {
            return fail("not_found", "File not found", { path: key });
          }
          const matches = countOccurrences(record.content, old_text);
          if (matches !== 1) {
            return fail("edit_mismatch", "old_text must match exactly once", { path: key, matches });
          }
          const next = record.content.replace(old_text, new_text);
          if (utf8Bytes(next) > MAX_WRITE_BYTES) {
            return fail("too_large", "Edited file would exceed 256 KiB", { path: key });
          }
          const saved = await saveMarkdownFile({ key, content: next, authorId: context.authorId });
          return {
            ok: true as const,
            path: key,
            etag: saved.etag ?? null,
          };
        } catch (error) {
          return mapCaughtError(error, path);
        }
      },
    }),

    create_folder: tool({
      description: "Create an empty folder in the vault. Missing parent folders are created. Fails if the folder already exists.",
      inputSchema: jsonSchema<{ path: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "Vault-relative folder path" },
        },
        required: ["path"],
      }),
      execute: async ({ path }) => {
        try {
          const prefix = coerceFolderPrefix(path);
          await ensureAncestorFolders(prefix);
          const result = await createVaultFolder({ prefix, existOk: false });
          return { ok: true as const, path: result.prefix, created: result.created };
        } catch (error) {
          return mapCaughtError(error, path);
        }
      },
    }),

    delete_path: tool({
      description:
        "Delete a markdown file or a folder (recursive, same as the file tree). confirm_path must equal path. Never delete the vault root.",
      inputSchema: jsonSchema<{ path: string; confirm_path: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "File or folder to delete" },
          confirm_path: { type: "string", description: "Must exactly equal path" },
        },
        required: ["path", "confirm_path"],
      }),
      execute: async ({ path, confirm_path }) => {
        try {
          if (path.trim() !== confirm_path.trim()) {
            return fail("not_confirmed", "confirm_path must equal path");
          }
          if (isVaultRoot(path)) {
            return fail("not_confirmed", "Refusing to delete the vault root");
          }
          if (isFilePathHint(path)) {
            const key = coerceFileKey(path);
            await deleteMarkdownFile({ key });
            return { ok: true as const, path: key, type: "file" as const };
          }
          const prefix = coerceFolderPrefix(path);
          await deleteVaultFolder({ prefix, recursive: true });
          return { ok: true as const, path: prefix, type: "folder" as const };
        } catch (error) {
          return mapCaughtError(error, path);
        }
      },
    }),

    move_path: tool({
      description: "Rename or move a file or folder. Destination must not already exist. Rename is a same-parent move.",
      inputSchema: jsonSchema<{ from: string; to: string }>({
        type: "object",
        properties: {
          from: { type: "string", description: "Current vault-relative path" },
          to: { type: "string", description: "Destination vault-relative path" },
        },
        required: ["from", "to"],
      }),
      execute: async ({ from, to }) => {
        try {
          const folder = !isFilePathHint(from);
          const fromRaw = folder ? coerceFolderPrefix(from) : coerceFileKey(from);
          const toRaw = folder ? coerceFolderPrefix(to) : coerceFileKey(to);
          const result = await moveVaultNode({ fromRaw, toRaw, overwrite: false });
          return { ok: true as const, from: fromRaw, to: toRaw, etag: result.etag ?? null };
        } catch (error) {
          return mapCaughtError(error, from);
        }
      },
    }),

    list_versions: tool({
      description: "List version history metadata for a markdown file (current is live on disk; snapshots are prior saves).",
      inputSchema: jsonSchema<{ path: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "Vault-relative markdown path" },
        },
        required: ["path"],
      }),
      execute: async ({ path }) => {
        try {
          const key = coerceFileKey(path);
          const versions = await listFileVersionSnapshots(key);
          return {
            ok: true as const,
            path: key,
            versions: versions.map((version) => ({
              id: version.id,
              createdAt: version.createdAt.toISOString(),
              size: version.size,
            })),
          };
        } catch (error) {
          return mapCaughtError(error, path);
        }
      },
    }),

    rollback_file: tool({
      description: "Roll a markdown file back to a previous version. The current content is saved as a new version first.",
      inputSchema: jsonSchema<{ path: string; version_id: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "Vault-relative markdown path" },
          version_id: { type: "string", description: "Version id from list_versions" },
        },
        required: ["path", "version_id"],
      }),
      execute: async ({ path, version_id }) => {
        try {
          const key = coerceFileKey(path);
          const result = await rollbackFileToVersion({
            key,
            versionId: version_id,
            authorId: context.authorId,
          });
          return {
            ok: true as const,
            path: key,
            etag: result.etag ?? null,
            lastModified: result.lastModified,
          };
        } catch (error) {
          return mapCaughtError(error, path);
        }
      },
    }),
  };
}
