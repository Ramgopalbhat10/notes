const INVALID_SEGMENT_PATTERN = /(^|\/)\.\.(\/|$)/;

export function normalizeFileKey(raw: string | null | undefined): string {
  if (!raw) {
    throw new Error("File key is required");
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("File key cannot be empty");
  }
  if (trimmed.startsWith("/")) {
    throw new Error("File key must be relative to the vault root");
  }
  if (trimmed.includes("\\")) {
    throw new Error("File key must use '/' as a separator");
  }
  if (INVALID_SEGMENT_PATTERN.test(trimmed)) {
    throw new Error("File key cannot contain '..'");
  }
  if (!trimmed.toLowerCase().endsWith(".md")) {
    throw new Error("Only markdown (.md) files are supported");
  }
  return trimmed;
}

export function normalizeFolderPrefix(raw: string | null | undefined): string {
  if (raw == null) {
    throw new Error("Folder prefix is required");
  }
  let value = raw.trim();
  if (!value) {
    throw new Error("Folder prefix cannot be empty");
  }
  if (value.startsWith("/")) {
    throw new Error("Folder prefix must be relative to the vault root");
  }
  if (value.includes("\\")) {
    throw new Error("Folder prefix must use '/' as a separator");
  }
  if (INVALID_SEGMENT_PATTERN.test(value)) {
    throw new Error("Folder prefix cannot contain '..'");
  }
  if (!value.endsWith("/")) {
    value = `${value}/`;
  }
  return value;
}

export function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Name cannot be empty");
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error("Name cannot include path separators");
  }
  if (INVALID_SEGMENT_PATTERN.test(trimmed)) {
    throw new Error("Name cannot contain '..'");
  }
  return trimmed;
}
