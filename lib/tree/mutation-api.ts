import { extractResponseError, parseJsonOrFallback } from "@/lib/http/client";

type MoveNodeRequestParams = {
  from: string;
  to: string;
  type: "file" | "folder";
  ifMatchEtag?: string;
};

export async function moveNodeRequest(params: MoveNodeRequestParams): Promise<{ etag?: string }> {
  const response = await fetch("/api/fs/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(await extractResponseError(response, "Request failed"));
  }

  return parseJsonOrFallback<{ etag?: string }>(response, {});
}

export async function createFolderRequest(prefix: string): Promise<void> {
  const response = await fetch("/api/fs/mkdir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix }),
  });

  if (!response.ok) {
    throw new Error(await extractResponseError(response, "Request failed"));
  }
}

export async function createFileRequest(key: string, content: string): Promise<{ etag?: string }> {
  const response = await fetch("/api/fs/file", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, content }),
  });

  if (!response.ok) {
    throw new Error(await extractResponseError(response, "Request failed"));
  }

  return parseJsonOrFallback<{ etag?: string }>(response, {});
}

export async function deleteFolderRequest(prefix: string): Promise<void> {
  const response = await fetch("/api/fs/folder", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, recursive: true }),
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(await extractResponseError(response, "Request failed"));
  }
}

export async function deleteFileRequest(key: string, ifMatchEtag?: string): Promise<void> {
  const response = await fetch("/api/fs/file", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, ifMatchEtag }),
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(await extractResponseError(response, "Request failed"));
  }
}
