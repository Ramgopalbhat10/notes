const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appUrl = /^https?:\/\//i.test(rawAppUrl) ? rawAppUrl : `https://${rawAppUrl}`;

export const siteMetadata = {
  product: "Markdown Vault",
  title: "Personal Notes - Markdown Vault",
  shortName: "Notes Vault",
  description:
    "Personal Notes keeps a cached S3-backed manifest in sync so you can browse, edit, and publish Markdown files without waiting on storage round-trips.",
  keywords: [
    "markdown",
    "notes",
    "next.js",
    "s3",
    "tigris",
    "file tree",
    "editor",
    "ai",
  ],
  creator: "Personal Notes",
  baseUrl: appUrl,
};

export function absoluteUrl(path = "/"): string {
  return new URL(path, siteMetadata.baseUrl).toString();
}

export function decodePathSegments(segments?: readonly string[]): string | null {
  if (!segments || segments.length === 0) {
    return null;
  }
  return segments.map((segment) => decodeURIComponent(segment)).join("/");
}

function humanizeSegment(segment: string): string {
  const cleaned = segment
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return "Untitled";
  }
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function workspaceTitle(relativePath: string | null): string {
  if (!relativePath) {
    return "Vault Workspace";
  }
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length === 0) {
    return "Vault Workspace";
  }
  return `${humanizeSegment(parts[parts.length - 1] ?? "Untitled")} - Vault Workspace`;
}

export function workspaceDescription(relativePath: string | null): string {
  if (!relativePath) {
    return "Navigate folders, edit Markdown, and chat with AI about anything inside your cached vault.";
  }
  return `Currently focused on "${relativePath}" inside your Markdown vault.`;
}

export function filesCanonicalPath(relativePath: string | null): string {
  if (!relativePath) {
    return "/files";
  }
  const encoded = relativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/files/${encoded}`;
}

export function publicCanonicalPath(relativePath: string | null): string {
  if (!relativePath) {
    return "/p";
  }
  const encoded = relativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/p/${encoded}`;
}
