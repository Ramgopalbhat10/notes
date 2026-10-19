import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// Keep key access limited to existing filesystem operations, never browser sessions.
const API_KEY_METHODS: Readonly<Record<string, readonly string[]>> = {
  "/api/fs/file": ["GET", "PUT", "DELETE"],
  "/api/fs/list": ["GET"],
  "/api/fs/mkdir": ["POST"],
  "/api/fs/folder": ["DELETE"],
  "/api/fs/move": ["POST"],
  "/api/fs/meta": ["GET", "PUT"],
};

export function hasValidFsApiKey(request: NextRequest): boolean {
  if (!API_KEY_METHODS[request.nextUrl.pathname]?.includes(request.method)) {
    return false;
  }

  const configuredKey = process.env.NOTES_API_KEY?.trim();
  if (!configuredKey) {
    return false;
  }

  const bearer = /^Bearer +(\S+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!bearer) {
    return false;
  }

  // Fixed-length digests make timingSafeEqual safe even for different key lengths.
  const suppliedHash = createHash("sha256").update(bearer[1]).digest();
  const configuredHash = createHash("sha256").update(configuredKey).digest();
  return timingSafeEqual(suppliedHash, configuredHash);
}
