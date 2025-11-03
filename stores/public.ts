"use client";

import { create } from "zustand";

type ShareRecord = {
  public: boolean;
  loading: boolean;
  updating: boolean;
  error: string | null;
  lastFetchedAt: number | null;
};

type ShareStoreState = {
  records: Record<string, ShareRecord>;
  load: (key: string, options?: { force?: boolean }) => Promise<void>;
  toggle: (key: string, nextPublic: boolean) => Promise<boolean>;
  clear: (key: string) => void;
};

type ApiError = {
  error?: string;
};

const DEFAULT_RECORD: ShareRecord = {
  public: false,
  loading: false,
  updating: false,
  error: null,
  lastFetchedAt: null,
};

const pendingLoads = new Map<string, number>();
let loadSeq = 0;

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;
    if (data && typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // ignore parse errors
  }
  return response.statusText || "Request failed";
}

export const usePublicStore = create<ShareStoreState>((set, get) => ({
  records: {},

  async load(key, options) {
    if (!key) {
      return;
    }
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return;
    }
    const record = get().records[normalizedKey];
    if (!options?.force && record && !record.loading && record.lastFetchedAt && Date.now() - record.lastFetchedAt < 5_000) {
      // Skip rapid refetches unless forced.
      return;
    }

    loadSeq += 1;
    const requestId = loadSeq;
    pendingLoads.set(normalizedKey, requestId);

    set((state) => ({
      records: {
        ...state.records,
        [normalizedKey]: {
          ...(state.records[normalizedKey] ?? DEFAULT_RECORD),
          loading: true,
          error: null,
        },
      },
    }));

    try {
      const response = await fetch(`/api/fs/meta?key=${encodeURIComponent(normalizedKey)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = (await response.json()) as { public: boolean };

      if (pendingLoads.get(normalizedKey) !== requestId) {
        return;
      }

      set((state) => ({
        records: {
          ...state.records,
          [normalizedKey]: {
            ...(state.records[normalizedKey] ?? DEFAULT_RECORD),
            public: Boolean(data?.public),
            loading: false,
            updating: false,
            error: null,
            lastFetchedAt: Date.now(),
          },
        },
      }));
    } catch (error) {
      if (pendingLoads.get(normalizedKey) !== requestId) {
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load sharing state";
      set((state) => ({
        records: {
          ...state.records,
          [normalizedKey]: {
            ...(state.records[normalizedKey] ?? DEFAULT_RECORD),
            loading: false,
            error: message,
          },
        },
      }));
    } finally {
      pendingLoads.delete(normalizedKey);
    }
  },

  async toggle(key, nextPublic) {
    if (!key) {
      return false;
    }
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return false;
    }

    const snapshot = get().records[normalizedKey] ?? DEFAULT_RECORD;
    if (snapshot.updating) {
      return false;
    }

    set((state) => ({
      records: {
        ...state.records,
        [normalizedKey]: {
          ...(state.records[normalizedKey] ?? DEFAULT_RECORD),
          public: nextPublic,
          updating: true,
          error: null,
        },
      },
    }));

    try {
      const response = await fetch("/api/fs/meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: normalizedKey, public: nextPublic }),
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = (await response.json()) as { public: boolean };
      set((state) => ({
        records: {
          ...state.records,
          [normalizedKey]: {
            ...(state.records[normalizedKey] ?? DEFAULT_RECORD),
            public: Boolean(data?.public),
            updating: false,
            loading: false,
            error: null,
            lastFetchedAt: Date.now(),
          },
        },
      }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update sharing state";
      set((state) => ({
        records: {
          ...state.records,
          [normalizedKey]: {
            ...(state.records[normalizedKey] ?? DEFAULT_RECORD),
            public: snapshot.public,
            updating: false,
            loading: false,
            error: message,
          },
        },
      }));
      return false;
    }
  },

  clear(key) {
    if (!key) {
      return;
    }
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return;
    }
    set((state) => {
      const next = { ...state.records };
      delete next[normalizedKey];
      return { records: next };
    });
  },
}));
