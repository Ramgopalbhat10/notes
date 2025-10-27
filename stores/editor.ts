"use client";

import { create } from "zustand";
import type { EditorView } from "@codemirror/view";
import { useTreeStore } from "@/stores/tree";
import {
  loadPersistentDocument,
  savePersistentDocument,
  subscribePersistentDocumentEvictions,
} from "@/lib/persistent-document-cache";

type EditorMode = "preview" | "edit";
type EditorStatus = "idle" | "loading" | "saving" | "error" | "conflict";

type SelectionRange = {
  from: number;
  to: number;
};

type CachedDocument = {
  content: string;
  etag: string | null;
  lastModified: string | null;
};

type EditorState = {
  fileKey: string | null;
  content: string;
  originalContent: string;
  etag: string | null;
  lastModified: string | null;
  mode: EditorMode;
  status: EditorStatus;
  error: string | null;
  errorSource: "load" | "save" | null;
  lastSavedAt: string | null;
  dirty: boolean;
  conflictMessage: string | null;
  selection: SelectionRange | null;
  loadFile: (key: string | null) => Promise<void>;
  setMode: (mode: EditorMode) => void;
  setContent: (value: string) => void;
  setSelection: (selection: SelectionRange | null) => void;
  registerEditorView: (view: EditorView | null) => void;
  applyAiResult: (text: string, options?: { range?: SelectionRange | null; strategy?: "replace" | "insert" }) => void;
  save: (origin?: "manual" | "auto") => Promise<boolean>;
  reset: () => void;
};

const initialState: Omit<
  EditorState,
  "loadFile" | "setMode" | "setContent" | "reset" | "save" | "setSelection" | "registerEditorView" | "applyAiResult"
> = {
  fileKey: null,
  content: "",
  originalContent: "",
  etag: null,
  lastModified: null,
  mode: "preview",
  status: "idle",
  error: null,
  errorSource: null,
  lastSavedAt: null,
  dirty: false,
  conflictMessage: null,
  selection: null,
};

let currentAbort: AbortController | null = null;
let loadSeq = 0;
let currentSaveAbort: AbortController | null = null;
let activeEditorView: EditorView | null = null;
const documentCache = new Map<string, CachedDocument>();

if (typeof window !== "undefined") {
  subscribePersistentDocumentEvictions((event) => {
    if (event.type === "single") {
      documentCache.delete(event.key);
      return;
    }
    for (const key of event.keys) {
      documentCache.delete(key);
    }
  });
}

async function ensureCachedDocument(key: string): Promise<CachedDocument | null> {
  const inMemory = documentCache.get(key);
  if (inMemory) {
    return inMemory;
  }
  const persistent = await loadPersistentDocument(key);
  if (!persistent) {
    return null;
  }
  const record: CachedDocument = {
    content: persistent.content,
    etag: persistent.etag,
    lastModified: persistent.lastModified,
  };
  documentCache.set(key, record);
  return record;
}

function rememberDocument(key: string, value: CachedDocument): void {
  documentCache.set(key, value);
  void savePersistentDocument(key, value);
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // ignore parse errors
  }
  return response.statusText || "Request failed";
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  async loadFile(key) {
    loadSeq += 1;
    const requestId = loadSeq;

    if (currentAbort) {
      currentAbort.abort();
    }

    if (!key) {
      set({ ...initialState });
      return;
    }

    const node = useTreeStore.getState().nodes[key];
    if (!node || node.type !== "file") {
      set({ ...initialState });
      return;
    }

    const controller = new AbortController();
    currentAbort = controller;

    const cached = await ensureCachedDocument(key);
    const requestHeaders: Record<string, string> = {};
    if (cached?.etag) {
      requestHeaders["If-None-Match"] = cached.etag;
    }

    if (cached) {
      set({
        fileKey: key,
        content: cached.content,
        originalContent: cached.content,
        etag: cached.etag,
        lastModified: cached.lastModified,
        status: "idle",
        lastSavedAt: cached.lastModified ?? null,
        error: null,
        conflictMessage: null,
        errorSource: null,
        dirty: false,
        mode: "preview",
        selection: null,
      });
    } else {
      set({
        status: "loading",
        error: null,
        conflictMessage: null,
        fileKey: key,
        errorSource: null,
        content: "",
        originalContent: "",
        etag: null,
        lastModified: null,
        dirty: false,
        mode: "preview",
        selection: null,
      });
    }

    try {
      const response = await fetch(`/api/fs/file?key=${encodeURIComponent(key)}`, {
        signal: controller.signal,
        headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
        cache: "no-cache",
      });
      if (response.status === 304) {
        if (requestId !== loadSeq) {
          return;
        }

        const responseEtag = response.headers.get("etag") ?? cached?.etag ?? null;
        const responseLastModifiedHeader = response.headers.get("last-modified");
        let responseLastModifiedIso = cached?.lastModified ?? null;
        if (responseLastModifiedHeader) {
          const parsedDate = new Date(responseLastModifiedHeader);
          if (!Number.isNaN(parsedDate.getTime())) {
            responseLastModifiedIso = parsedDate.toISOString();
          }
        }
        const cachedContent = cached?.content ?? get().content ?? "";

        rememberDocument(key, {
          content: cachedContent,
          etag: responseEtag,
          lastModified: responseLastModifiedIso,
        });

        set((current) => ({
          ...current,
          fileKey: key,
          content: cachedContent,
          originalContent: cachedContent,
          etag: responseEtag,
          lastModified: responseLastModifiedIso,
          lastSavedAt: responseLastModifiedIso ?? current.lastSavedAt,
          status: "idle",
          dirty: false,
          error: null,
          errorSource: null,
          conflictMessage: null,
          mode: "preview",
          selection: null,
        }));

        if (responseEtag || responseLastModifiedIso) {
          useTreeStore.setState((state) => {
            const target = state.nodes[key];
            if (!target || target.type !== "file") {
              return state;
            }
            return {
              ...state,
              nodes: {
                ...state.nodes,
                [key]: {
                  ...target,
                  etag: responseEtag ?? target.etag,
                  lastModified: responseLastModifiedIso ?? target.lastModified,
                },
              },
            };
          });
        }

        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = typeof body?.error === "string" ? body.error : "Failed to load file";
        throw new Error(message);
      }
      const data = (await response.json()) as {
        key: string;
        content: string;
        etag?: string;
        lastModified?: string;
      };
      if (requestId !== loadSeq) {
        return;
      }

      const etag = data.etag ?? null;
      const lastModified = data.lastModified ?? null;

      rememberDocument(key, {
        content: data.content,
        etag,
        lastModified,
      });

      set({
        fileKey: key,
        content: data.content,
        originalContent: data.content,
        etag,
        lastModified,
        status: "idle",
        dirty: false,
        error: null,
        lastSavedAt: lastModified,
        mode: "preview",
        errorSource: null,
        selection: null,
      });

      useTreeStore.setState((state) => {
        const target = state.nodes[key];
        if (!target || target.type !== "file") {
          return state;
        }
        return {
          ...state,
          nodes: {
            ...state.nodes,
            [key]: {
              ...target,
              etag: etag ?? target.etag,
              lastModified: lastModified ?? target.lastModified,
            },
          },
        };
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load file";
      if (cached) {
        set((current) => ({
          ...current,
          status: "idle",
          error: message,
          errorSource: "load",
        }));
      } else {
        set({
          status: "error",
          error: message,
          conflictMessage: null,
          errorSource: "load",
        });
      }
    } finally {
      if (currentAbort === controller) {
        currentAbort = null;
      }
    }
  },

  setMode(mode) {
    set({ mode });
  },

  setContent(value) {
    set((state) => ({
      content: value,
      dirty: state.fileKey ? value !== state.originalContent : false,
    }));
  },

  setSelection(selection) {
    set({ selection });
  },

  registerEditorView(view) {
    activeEditorView = view;
    if (!view) {
      set({ selection: null });
      return;
    }
    const main = view.state.selection.main;
    set({ selection: { from: main.from, to: main.to } });
  },

  applyAiResult(text, options) {
    const state = get();
    const strategy = options?.strategy ?? (options?.range && options.range.to !== options.range.from ? "replace" : "insert");
    const range = options?.range ?? null;

    const resolveRange = (docLength: number): SelectionRange => {
      const clamp = (value: number) => Math.max(0, Math.min(docLength, value));
      if (range) {
        const from = clamp(range.from);
        const to = clamp(range.to);
        if (strategy === "insert") {
          return { from, to: from };
        }
        return { from: Math.min(from, to), to: Math.max(from, to) };
      }
      const currentSelection = state.selection;
      if (currentSelection) {
        const from = clamp(currentSelection.from);
        const to = clamp(currentSelection.to);
        if (strategy === "insert") {
          return { from, to: from };
        }
        if (from !== to) {
          return { from: Math.min(from, to), to: Math.max(from, to) };
        }
        return { from, to };
      }
      if (strategy === "insert") {
        return { from: docLength, to: docLength };
      }
      return { from: 0, to: docLength };
    };

    if (state.mode === "edit" && activeEditorView) {
      const view = activeEditorView;
      const { from, to } = resolveRange(view.state.doc.length);
      const insertPos = from + text.length;
      view.dispatch({
        changes: {
          from,
          to,
          insert: text,
        },
        selection: { anchor: insertPos },
        scrollIntoView: true,
      });
      return;
    }

    const doc = state.content;
    const { from, to } = resolveRange(doc.length);
    const before = doc.slice(0, from);
    const after = strategy === "insert" ? doc.slice(from) : doc.slice(to);
    const next = `${before}${text}${after}`;
    get().setContent(next);
    set({ selection: { from: from + text.length, to: from + text.length }, mode: "edit" });
  },

  async save(_origin?: "manual" | "auto") {
    void _origin;
    const state = get();
    const key = state.fileKey;
    if (!key || !state.dirty) {
      return false;
    }

    if (currentSaveAbort) {
      currentSaveAbort.abort();
    }

    const controller = new AbortController();
    currentSaveAbort = controller;

    set({ status: "saving", error: null, conflictMessage: null, errorSource: null });

    try {
      const payload: Record<string, unknown> = {
        key,
        content: state.content,
      };
      if (state.etag) {
        payload.ifMatchEtag = state.etag;
      }

      const response = await fetch("/api/fs/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 409) {
          const message = await parseErrorResponse(response);
          set({ status: "conflict", conflictMessage: message || null, error: null, errorSource: "save" });
          return false;
        }
        const message = await parseErrorResponse(response);
        set({ status: "error", error: message, conflictMessage: null, errorSource: "save" });
        return false;
      }

      const data = (await response.json().catch(() => ({}))) as { etag?: string };
      const newEtag = data?.etag ?? state.etag;
      const savedAt = new Date().toISOString();

      if (get().fileKey !== key) {
        return true;
      }

      set((current) => ({
        ...current,
        originalContent: current.content,
        dirty: false,
        etag: newEtag,
        lastSavedAt: savedAt,
        lastModified: savedAt,
        status: "idle",
        error: null,
        conflictMessage: null,
        errorSource: null,
      }));

      const latestState = get();
      rememberDocument(key, {
        content: latestState.content,
        etag: newEtag ?? null,
        lastModified: latestState.lastModified,
      });

      useTreeStore.setState((treeState) => {
        const target = treeState.nodes[key];
        if (!target || target.type !== "file") {
          return treeState;
        }
        return {
          ...treeState,
          nodes: {
            ...treeState.nodes,
            [key]: {
              ...target,
              etag: newEtag ?? target.etag,
              lastModified: savedAt,
            },
          },
        };
      });

      return true;
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        if (currentSaveAbort === controller) {
          set({ status: "idle" });
        }
        return false;
      }
      const message = error instanceof Error ? error.message : "Failed to save file";
      set({ status: "error", error: message, errorSource: "save" });
      return false;
    } finally {
      if (currentSaveAbort === controller) {
        currentSaveAbort = null;
      }
    }
  },

  reset() {
    if (currentAbort) {
      currentAbort.abort();
      currentAbort = null;
    }
    if (currentSaveAbort) {
      currentSaveAbort.abort();
      currentSaveAbort = null;
    }
    activeEditorView = null;
    documentCache.clear();
    set({ ...initialState });
  },
}));

if (typeof window !== "undefined") {
  const globalWindow = window as typeof window & {
    __MRGB_EDITOR_STORE__?: typeof useEditorStore;
  };
  globalWindow.__MRGB_EDITOR_STORE__ = useEditorStore;
}
