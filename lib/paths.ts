/**
 * Extracts the base name of a file or folder from its path.
 * Handles paths with or without trailing slashes.
 *
 * @example
 * basename("foo/bar.txt") // "bar.txt"
 * basename("foo/bar/")    // "bar"
 * basename("foo")         // "foo"
 */
export function basename(path: string): string {
  if (!path) {
    return path;
  }
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

/**
 * Extracts the parent folder path from a file or folder path.
 * Returns null if the path is at the root.
 * The returned path always ends with a slash.
 *
 * @example
 * getParentPath("foo/bar.txt") // "foo/"
 * getParentPath("foo/bar/")    // "foo/"
 * getParentPath("foo")         // null
 */
export function getParentPath(path: string): string | null {
  if (!path) {
    return null;
  }
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  const idx = trimmed.lastIndexOf("/");
  if (idx === -1) {
    return null;
  }
  return trimmed.slice(0, idx + 1);
}
