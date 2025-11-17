export function normalizeEtag(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.replace(/^W\//i, "").replace(/"/g, "");
}
