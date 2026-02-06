const DEFAULT_MARKDOWN_IMAGE_HOSTS = ["avatars.githubusercontent.com"];

function normalizeHost(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    return null;
  }

  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
}

function parseAllowedHosts(raw: string | undefined): string[] {
  if (!raw) {
    return [...DEFAULT_MARKDOWN_IMAGE_HOSTS];
  }

  const hosts = raw
    .split(",")
    .map((entry) => normalizeHost(entry))
    .filter((entry): entry is string => Boolean(entry));

  if (hosts.length === 0) {
    return [...DEFAULT_MARKDOWN_IMAGE_HOSTS];
  }

  return Array.from(new Set(hosts));
}

export function getAllowedMarkdownImageHosts(): string[] {
  return parseAllowedHosts(process.env.NEXT_PUBLIC_MARKDOWN_IMAGE_HOSTS);
}

function isRelativeUrl(url: string): boolean {
  return (
    url.startsWith("/") ||
    url.startsWith("./") ||
    url.startsWith("../") ||
    url.startsWith("?") ||
    url.startsWith("#")
  );
}

function hostMatchesAllowlist(hostname: string, allowedHosts: string[]): boolean {
  const normalizedHost = hostname.toLowerCase();
  return allowedHosts.some((allowedHost) => {
    const normalizedAllowed = allowedHost.toLowerCase();
    return normalizedHost === normalizedAllowed || normalizedHost.endsWith(`.${normalizedAllowed}`);
  });
}

export function isAllowedMarkdownImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  if (isRelativeUrl(trimmed)) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  const isSecureHttp = parsed.protocol === "https:";
  const isLocalHttp = parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");

  if (!isSecureHttp && !isLocalHttp) {
    return false;
  }

  const allowedHosts = getAllowedMarkdownImageHosts();
  return hostMatchesAllowlist(parsed.hostname, allowedHosts);
}
