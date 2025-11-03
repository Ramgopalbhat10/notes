import type { FileTreeManifest } from "@/lib/file-tree-manifest";
import { formatIfNoneMatch, sanitizeEtag } from "./utils";
import type { RefreshSource, RefreshState } from "./types";

type StoreSetter<TState> = (updater: Partial<TState> | ((state: TState) => Partial<TState>)) => void;

type RefreshableState = {
  refreshState: RefreshState;
  refreshError: string | null;
  refreshSuccessAt: string | null;
  refreshLastSource: RefreshSource;
  pendingMutations: number;
};

const REFRESH_DEBOUNCE_MS = 100;

export async function fetchManifest(
  etag: string | null,
  force: boolean,
): Promise<{ manifest?: FileTreeManifest; etag?: string | null }> {
  const headers = new Headers();
  const headerValue = formatIfNoneMatch(etag);
  if (headerValue) {
    headers.set("If-None-Match", headerValue);
  }

  const response = await fetch("/api/tree", {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (response.status === 304) {
    return {};
  }

  if (!response.ok) {
    throw new Error(await extractTreeError(response));
  }

  const manifest = (await response.json()) as FileTreeManifest;
  const nextEtag = sanitizeEtag(response.headers.get("ETag"));
  return { manifest, etag: nextEtag };
}

export function createManifestRefresher<TState extends RefreshableState>(
  loadManifest: (options?: { force?: boolean }) => Promise<void>,
  set: StoreSetter<TState>,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let rerun = false;

  const run = async (source: RefreshSource) => {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    set({ refreshState: "running", refreshLastSource: source } as Partial<TState>);
    try {
      const response = await fetch("/api/tree/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(await extractTreeError(response));
      }
      await loadManifest({ force: true });
      set((state) => ({
        refreshState: state.pendingMutations > 0 ? "pending" : "idle",
        refreshSuccessAt: new Date().toISOString(),
        refreshError: null,
        refreshLastSource: source,
      } as Partial<TState>));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh file tree";
      set((state) => ({
        refreshState: state.pendingMutations > 0 ? "pending" : "idle",
        refreshError: message,
        refreshLastSource: source,
      } as Partial<TState>));
    } finally {
      running = false;
      if (rerun) {
        rerun = false;
        void run(source);
      }
    }
  };

  const schedule = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      void run("mutation");
    }, REFRESH_DEBOUNCE_MS);
  };

  const runImmediate = async (source: RefreshSource) => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    await run(source);
  };

  return { schedule, runImmediate } as const;
}

export async function extractTreeError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    // ignore
  }
  return response.statusText || "Request failed";
}
