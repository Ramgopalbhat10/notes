export function basename(input: string): string {
  if (!input) {
    return input;
  }
  const trimmed = input.endsWith("/") ? input.slice(0, -1) : input;
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

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
