import { normalizeFileKey, normalizeFolderPrefix } from "@/lib/fs/fs-validation";

export function isVaultRoot(raw: string | null | undefined): boolean {
  const value = (raw ?? "").trim();
  return value === "" || value === "/" || value === "." || value === "./";
}

export function coerceFileKey(raw: string): string {
  const trimmed = raw.trim().replace(/^\/+/, "");
  if (!trimmed) {
    throw new Error("File key is required");
  }
  const withExtension = trimmed.toLowerCase().endsWith(".md") ? trimmed : `${trimmed}.md`;
  return normalizeFileKey(withExtension);
}

export function coerceFolderPrefix(raw: string): string {
  if (isVaultRoot(raw)) {
    throw new Error("Folder prefix cannot be empty");
  }
  return normalizeFolderPrefix(raw);
}

export function isFilePathHint(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.toLowerCase().endsWith(".md") && !trimmed.endsWith("/");
}

export function utf8Bytes(text: string): number {
  return Buffer.byteLength(text, "utf-8");
}
