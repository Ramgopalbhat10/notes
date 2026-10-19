import { timingSafeEqual } from "node:crypto";
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

  const suppliedBytes = Buffer.from(bearer[1], "utf8");
  const configuredBytes = Buffer.from(configuredKey, "utf8");
  // timingSafeEqual requires equal byte lengths; a different length cannot match.
  return suppliedBytes.length === configuredBytes.length && timingSafeEqual(suppliedBytes, configuredBytes);
}
