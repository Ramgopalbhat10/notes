/**
 * Returns the last portion of a path.
 * Trailing slashes are ignored.
 */
export function basename(path: string): string {
  if (!path) {
    return path;
  }
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}
