"use client";

import { create } from "zustand";
import type { BlockNoteEditor } from "@blocknote/core";
import { saveDocumentAction } from "@/app/actions/documents";
import { useTreeStore } from "@/stores/tree";
import { useSettingsStore } from "@/stores/settings";
import {
  loadPersistentDocument,
  savePersistentDocument,
  subscribePersistentDocumentEvictions,
} from "@/lib/persistent-document-cache";

type EditorMode = "preview" | "edit";
type EditorStatus = "idle" | "loading" | "saving" | "error" | "conflict";

function getDefaultMode(): EditorMode {
  try {
    return useSettingsStore.getState().settings.editor.defaultMode;
  } catch {
    return "preview";
  }
}

// We use 'any' for now as BlockNote selection is complex and we don't strictly need to sync it to store
// in the same way as CodeMirror.
type SelectionRange = any;

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
  registerEditorView: (view: BlockNoteEditor | null) => void;
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
let activeEditorView: BlockNoteEditor | null = null;
const documentCache = new Map<string, CachedDocument>();
const firstOpenValidatedKeys = new Set<string>();

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

    const cached = await ensureCachedDocument(key);
    const isFirstOpen = !firstOpenValidatedKeys.has(key);
    let skipNetwork = Boolean(cached?.etag && node.etag && cached.etag === node.etag);
    const requestHeaders: Record<string, string> = {};
    if (cached?.etag) {
      requestHeaders["If-None-Match"] = cached.etag;
    }

    const forceFirstOpen = isFirstOpen && Boolean(cached?.etag);
    if (forceFirstOpen) {
      skipNetwork = false;
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
        mode: getDefaultMode(),
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
        mode: getDefaultMode(),
        selection: null,
      });
    }

    if (skipNetwork) {
      currentAbort = null;
      return;
    }

    let controller: AbortController | null = null;
    try {
      controller = new AbortController();
      currentAbort = controller;
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
          mode: getDefaultMode(),
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

        firstOpenValidatedKeys.add(key);
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
        mode: getDefaultMode(),
        errorSource: null,
        selection: null,
      });

      firstOpenValidatedKeys.add(key);

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
      if (controller && currentAbort === controller) {
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
    // BlockNote handles selection internally, we might not need to sync it to store constantly
    // or we can subscribe to selection changes if needed.
    // For now, we'll just clear it or set a dummy if needed.
    set({ selection: null });
  },

  async applyAiResult(text, options) {
    const state = get();
    const strategy = options?.strategy ?? "insert";

    if (state.mode === "edit" && activeEditorView) {
      const editor = activeEditorView;

      // Parse markdown to blocks
      const blocks = await editor.tryParseMarkdownToBlocks(text);

      if (strategy === "replace") {
        // Replace current selection
        const selection = editor.getSelection();
        if (selection) {
          const currentSelection = editor.getSelection();
          if (currentSelection && currentSelection.blocks.length > 0) {
            editor.replaceBlocks(currentSelection.blocks, blocks);
          } else {
            // Insert at cursor
            const cursor = editor.getTextCursorPosition();
            editor.insertBlocks(blocks, cursor.block, "after");
          }
        }
      } else {
        // Insert
        const cursor = editor.getTextCursorPosition();
        // insertBlocks(blocks, referenceBlock, placement)
        editor.insertBlocks(blocks, cursor.block, "after");
      }
      return;
    }

    // Fallback for non-edit mode (append to content)
    const doc = state.content;
    const next = `${doc}\n\n${text}`;
    get().setContent(next);
    set({ mode: "edit" });
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
      const result = await saveDocumentAction({
        key,
        content: state.content,
        ifMatchEtag: state.etag,
      });

      if (controller.signal.aborted) {
        return false;
      }

      if (!result.ok) {
        if (result.reason === "conflict") {
          set({ status: "conflict", conflictMessage: result.message || null, error: null, errorSource: "save" });
          return false;
        }
        const message = result.message || "Failed to save file";
        set({ status: "error", error: message, conflictMessage: null, errorSource: "save" });
        return false;
      }

      const newEtag = result.etag ?? state.etag;
      const savedAt = result.lastModified ?? new Date().toISOString();

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
