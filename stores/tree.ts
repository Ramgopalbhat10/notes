"use client";

import { create } from "zustand";

import { normalizeName } from "@/lib/fs-validation";
import type { FileTreeManifest } from "@/lib/file-tree-manifest";
import { isFolderNode } from "@/lib/file-tree-manifest";
import {
  removePersistentDocument,
  removePersistentDocumentsWithPrefix,
} from "@/lib/persistent-document-cache";
import type {
  FileNode,
  FolderNode,
  Node as TreeNode,
  NodeId,
  RefreshSource,
  RefreshState,
  RouteTargetState,
  SelectByPathResult,
  SelectionOrigin,
  TreeSnapshot,
} from "@/lib/tree/types";
import {
  basename,
  buildSlugState,
  ensureFilePath,
  ensureFolderPath,
  filterOpenFolders,
  openAncestorFolders,
  parentPathFromFolderKey,
  parentPathFromKey,
  removeNodesWithPrefix,
  slugifySegment,
} from "@/lib/tree/utils";
import {
  createManifestRefresher,
  extractTreeError,
  fetchManifest,
} from "@/lib/tree/manifest-client";
import { createMutationQueue } from "@/lib/tree/mutation-queue";
import { captureTreeSnapshot, restoreTreeSnapshot } from "@/lib/tree/snapshots";
type EditorStoreHook = typeof import("./editor")["useEditorStore"];

export type Node = TreeNode;
export type { NodeId, FileNode, FolderNode, SelectByPathResult } from "@/lib/tree/types";

export const ROOT_PARENT_KEY = "__root__";

const EDITOR_STORE_GLOBAL_KEY = "__MRGB_EDITOR_STORE__";

function getEditorStore(): EditorStoreHook | null {
  if (typeof window === "undefined") {
    return null;
  }
  const globalWindow = window as typeof window & { [EDITOR_STORE_GLOBAL_KEY]?: EditorStoreHook };
  if (globalWindow[EDITOR_STORE_GLOBAL_KEY]) {
    return globalWindow[EDITOR_STORE_GLOBAL_KEY] ?? null;
  }
  void import("./editor")
    .then((module) => {
      globalWindow[EDITOR_STORE_GLOBAL_KEY] = module.useEditorStore;
    })
    .catch(() => {
      // ignore load failures; selection will proceed without dirty guard
    });
  return globalWindow[EDITOR_STORE_GLOBAL_KEY] ?? null;
}
type TreeState = {
  nodes: Record<NodeId, TreeNode>;
  rootIds: NodeId[];
  openFolders: Record<NodeId, boolean>;
  loadingByParent: Record<string, boolean>;
  errorByParent: Record<string, string | null>;
  selectedId: NodeId | null;
  initialized: boolean;
  manifestEtag: string | null;
  manifestMetadata: FileTreeManifest["metadata"] | null;
  selectionOrigin: SelectionOrigin;
  routeTarget: RouteTargetState;
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
  refreshState: RefreshState;
  refreshError: string | null;
  refreshSuccessAt: string | null;
  refreshLastSource: RefreshSource;
  pendingMutations: number;
  viewHistory: NodeId[];

  initRoot: () => Promise<void>;
  toggleFolder: (id: NodeId) => void;
  select: (id: NodeId) => void;
  selectByPath: (path: string | null) => SelectByPathResult;
  acknowledgeSelectionOrigin: () => void;
  refreshTree: (options?: { silent?: boolean }) => Promise<void>;
  createFolder: (parentId: NodeId | null, name: string) => Promise<void>;
  createFile: (parentId: NodeId | null, name: string, initialContent?: string) => Promise<void>;
  renameNode: (id: NodeId, newName: string) => Promise<void>;
  deleteNode: (id: NodeId) => Promise<void>;
  moveNode: (id: NodeId, targetParentId: NodeId | null) => Promise<void>;
  pushToHistory: (id: NodeId) => void;
  removeFromHistory: (id: NodeId) => void;
  getPreviousInHistory: () => NodeId | null;
};

function parentKey(id: NodeId | null): string {
  return id ?? ROOT_PARENT_KEY;
}

/**
 * Appends an ID to history if it's not already the last entry.
 */
function appendToHistoryIfNew(history: NodeId[], id: NodeId): NodeId[] {
  const lastId = history.length > 0 ? history[history.length - 1] : null;
  return lastId === id ? history : [...history, id];
}

/**
 * Saves the last viewed file to persistent preferences.
 */
function persistLastViewedFile(id: NodeId): void {
  void import("@/lib/persistent-preferences").then(({ saveLastViewedFile }) => {
    void saveLastViewedFile(id);
  });
}

function createSnapshot(state: TreeState): TreeSnapshot {
  return {
    nodes: state.nodes,
    rootIds: state.rootIds,
    openFolders: state.openFolders,
    slugToId: state.slugToId,
    idToSlug: state.idToSlug,
    selectedId: state.selectedId,
    routeTarget: state.routeTarget,
    selectionOrigin: state.selectionOrigin,
  };
}

function buildStateFromManifest(manifest: FileTreeManifest): {
  nodes: Record<NodeId, TreeNode>;
  rootIds: NodeId[];
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
} {
  const nodes: Record<NodeId, TreeNode> = {};

  manifest.nodes.forEach((entry) => {
    if (isFolderNode(entry)) {
      const path = entry.path.endsWith("/") ? entry.path : `${entry.path}/`;
      nodes[entry.id] = {
        id: entry.id,
        type: "folder",
        name: entry.name,
        path,
        parentId: entry.parentId,
        children: [...entry.childrenIds].sort(),
        childrenLoaded: true,
        lastModified: entry.lastModified,
      } satisfies FolderNode;
    } else {
      nodes[entry.id] = {
        id: entry.id,
        type: "file",
        name: entry.name,
        path: entry.path,
        parentId: entry.parentId,
        etag: entry.etag,
        lastModified: entry.lastModified,
        size: entry.size,
      } satisfies FileNode;
    }
  });

  const { slugToId, idToSlug } = buildSlugState(nodes);

  return {
    nodes,
    rootIds: [...manifest.rootIds].sort(),
    slugToId,
    idToSlug,
  };
}

function addNodeToState(state: TreeState, node: TreeNode): TreeState {
  const nodes = { ...state.nodes, [node.id]: node };
  let rootIds = state.rootIds;
  const openFolders = { ...state.openFolders };

  if (node.parentId) {
    const parent = nodes[node.parentId];
    if (parent && parent.type === "folder") {
      const children = new Set(parent.children ?? []);
      children.add(node.id);
      nodes[node.parentId] = {
        ...parent,
        children: Array.from(children).sort(),
        childrenLoaded: true,
      };
    }
    openFolders[node.parentId] = true;
  } else {
    rootIds = Array.from(new Set([...state.rootIds, node.id])).sort();
  }

  const { slugToId, idToSlug } = buildSlugState(nodes);

  return {
    ...state,
    nodes,
    rootIds,
    openFolders,
    slugToId,
    idToSlug,
  };
}

function removeNodeFromState(state: TreeState, id: NodeId): TreeState {
  const node = state.nodes[id];
  if (!node) {
    return state;
  }
  const nodes = { ...state.nodes };
  delete nodes[id];
  if (node.type === "folder") {
    removeNodesWithPrefix(nodes, node.path);
  }

  let rootIds = state.rootIds;
  const openFolders = { ...state.openFolders };
  if (!node.parentId) {
    rootIds = state.rootIds.filter((rootId) => rootId !== id);
  } else {
    const parent = nodes[node.parentId];
    if (parent && parent.type === "folder") {
      nodes[node.parentId] = {
        ...parent,
        children: parent.children.filter((childId: NodeId) => childId !== id),
      };
    }
  }
  delete openFolders[id];

  const { slugToId, idToSlug } = buildSlugState(nodes);

  return {
    ...state,
    nodes,
    rootIds,
    openFolders,
    selectedId: state.selectedId === id ? null : state.selectedId,
    slugToId,
    idToSlug,
  };
}

export const useTreeStore = create<TreeState>((set, get) => {
  const loadManifest = async ({ force = false }: { force?: boolean } = {}) => {
    const state = get();
    if (state.loadingByParent[parentKey(null)]) {
      return;
    }

    set((current) => ({
      loadingByParent: { ...current.loadingByParent, [ROOT_PARENT_KEY]: true },
      errorByParent: { ...current.errorByParent, [ROOT_PARENT_KEY]: null },
    }));

    try {
      const { manifest, etag } = await fetchManifest(get().manifestEtag, force);
      if (!manifest) {
        set((current) => ({
          loadingByParent: { ...current.loadingByParent, [ROOT_PARENT_KEY]: false },
        }));
        return;
      }

      const { nodes, rootIds, slugToId, idToSlug } = buildStateFromManifest(manifest);

      set((current) => {
        const openFolders = filterOpenFolders(current.openFolders, nodes);
        const selectedId = current.selectedId && nodes[current.selectedId]
          ? current.selectedId
          : null;

        // Clean up viewHistory: remove IDs that no longer exist
        const viewHistory = current.viewHistory.filter((id) => nodes[id] !== undefined);

        return {
          nodes,
          rootIds,
          openFolders,
          selectedId,
          manifestEtag: etag ?? current.manifestEtag,
          manifestMetadata: manifest.metadata,
          loadingByParent: { ...current.loadingByParent, [ROOT_PARENT_KEY]: false },
          slugToId,
          idToSlug,
          viewHistory,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load file tree";
      set((current) => ({
        loadingByParent: { ...current.loadingByParent, [ROOT_PARENT_KEY]: false },
        errorByParent: { ...current.errorByParent, [ROOT_PARENT_KEY]: message },
      }));
    }
  };

  const { schedule: scheduleManifestRefresh, runImmediate: runManifestRefreshImmediate } =
    createManifestRefresher(loadManifest, set);
  
  // Simple manifest reload function that doesn't trigger full S3 refresh
  const reloadManifestOnly = async () => {
    await loadManifest({ force: true });
  };
  
  const enqueueMutation = createMutationQueue(set, get, reloadManifestOnly);

  const queueMove = (nodeId: NodeId, targetPath: string) => {
    const state = get();
    const node = state.nodes[nodeId];
    if (!node) {
      return;
    }
    if (node.path === targetPath) {
      return;
    }

    const snapshot = captureTreeSnapshot(createSnapshot(state));
    const newParentId = node.type === "folder"
      ? parentPathFromFolderKey(targetPath)
      : parentPathFromKey(targetPath);
    const newName = basename(targetPath);

    const updatedNode: TreeNode = node.type === "folder"
      ? {
          ...node,
          id: targetPath,
          path: targetPath,
          name: newName,
          parentId: newParentId,
        }
      : {
          ...node,
          id: targetPath,
          path: targetPath,
          name: newName,
          parentId: newParentId,
        };

    set((current) => {
      const without = removeNodeFromState(current, node.id);
      const next = addNodeToState(without, updatedNode);
      if (updatedNode.type === "file") {
        return {
          ...next,
          selectedId: updatedNode.id,
          selectionOrigin: "user",
          routeTarget: null,
        };
      }
      return next;
    });

    enqueueMutation({
      description: `move:${node.path}->${targetPath}`,
      perform: async () => {
        const body: Record<string, unknown> = {
          fromKey: node.path,
          toKey: targetPath,
          overwrite: false,
        };
        if (node.type === "file" && node.etag) {
          body.ifMatchEtag = node.etag;
        }
        const response = await fetch("/api/fs/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(await extractTreeError(response));
        }
        const data = await response.json().catch(() => ({})) as { etag?: string };
        if (updatedNode.type === "file" && typeof data?.etag === "string") {
          set((current) => ({
            nodes: {
              ...current.nodes,
              [updatedNode.id]: {
                ...(current.nodes[updatedNode.id] as FileNode),
                etag: data.etag,
              },
            },
          }));
        }
        if (node.type === "folder") {
          await removePersistentDocumentsWithPrefix(node.path);
        } else {
          await removePersistentDocument(node.path);
        }
      },
      rollback: () => restoreTreeSnapshot(set, snapshot),
    });
  };

  const refreshTree = async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      scheduleManifestRefresh();
      return;
    }
    await runManifestRefreshImmediate("manual");
  };

  return {
    nodes: {},
    rootIds: [],
    openFolders: {},
    loadingByParent: {},
    errorByParent: {},
    selectedId: null,
    initialized: false,
    manifestEtag: null,
    manifestMetadata: null,
    selectionOrigin: null,
    routeTarget: null,
    slugToId: {},
    idToSlug: {},
    refreshState: "idle",
    refreshError: null,
    refreshSuccessAt: null,
    refreshLastSource: null,
    pendingMutations: 0,
    viewHistory: [],

    initRoot: async () => {
      const state = get();
      if (state.initialized || state.loadingByParent[parentKey(null)]) {
        return;
      }
      await loadManifest({ force: true });
      set({ initialized: true });
    },

    toggleFolder: (id) => {
      const node = get().nodes[id];
      if (!node || node.type !== "folder") {
        return;
      }
      const isOpen = get().openFolders[id] ?? false;
      set((state) => ({
        openFolders: { ...state.openFolders, [id]: !isOpen },
      }));
    },

    select: (id) => {
      const node = get().nodes[id];
      if (!node || node.type !== "file") {
        return;
      }
      const editorStore = getEditorStore();
      const editorState = editorStore?.getState();
      if (
        editorState?.fileKey &&
        editorState.fileKey !== node.id &&
        (editorState.dirty || editorState.status === "conflict") &&
        typeof window !== "undefined"
      ) {
        const confirmed = window.confirm(
          "You have unsaved changes. Switching files will discard them. Continue?",
        );
        if (!confirmed) {
          return;
        }
      }
      set((state) => ({
        selectedId: id,
        selectionOrigin: "user",
        routeTarget: null,
        viewHistory: appendToHistoryIfNew(state.viewHistory, id),
      }));

      persistLastViewedFile(id);
    },

    selectByPath: (rawPath) => {
      const path = rawPath?.trim();
      if (!path) {
        set({ selectedId: null, selectionOrigin: "route", routeTarget: null });
        return { status: "cleared" } satisfies SelectByPathResult;
      }

      const state = get();

      if (!state.initialized) {
        return { status: "pending" } satisfies SelectByPathResult;
      }

      const trimmedLeading = path.replace(/^\/+/, "");
      const hasTrailingSlash = /\/$/.test(trimmedLeading);
      const withoutTrailing = trimmedLeading.replace(/\/+$/, "");
      const segments = withoutTrailing ? withoutTrailing.split("/").filter((segment) => segment.length > 0) : [];

      const slugSegments = segments.map((segment, index: number) => {
        const isLast = index === segments.length - 1;
        return slugifySegment(segment, isLast && !hasTrailingSlash);
      });
      const baseSlug = slugSegments.join("/");
      const slugKey = hasTrailingSlash ? (baseSlug ? `${baseSlug}/` : "") : baseSlug;

      const nodes = state.nodes;
      let target: TreeNode | undefined;
      if (slugKey) {
        target = state.slugToId[slugKey] ? nodes[state.slugToId[slugKey]] : undefined;
        if (!target && !slugKey.endsWith("/")) {
          const folderKey = `${slugKey}/`;
          target = state.slugToId[folderKey] ? nodes[state.slugToId[folderKey]] : undefined;
        }
      }

      if (!target) {
        const canonicalCandidate = trimmedLeading;
        target = nodes[canonicalCandidate];
        if (!target && !canonicalCandidate.endsWith("/")) {
          target = nodes[`${canonicalCandidate}/`];
        }
      }

      if (!target) {
        const missingSlug = slugKey || trimmedLeading;
        console.warn("[tree] Route path not found", missingSlug);
        set((current) => ({
          ...current,
          selectedId: null,
          selectionOrigin: "route",
          routeTarget: { path: missingSlug, status: "missing" },
        }));
        return { status: "missing", path: missingSlug } satisfies SelectByPathResult;
      }

      if (target.type === "file") {
        set((current) => {
          const openFolders = openAncestorFolders(current.nodes, current.openFolders, target?.parentId ?? null);
          return {
            ...current,
            selectedId: target!.id,
            openFolders,
            selectionOrigin: "route",
            routeTarget: null,
            viewHistory: appendToHistoryIfNew(current.viewHistory, target!.id),
          };
        });

        persistLastViewedFile(target!.id);

        return { status: "selected", nodeId: target.id } satisfies SelectByPathResult;
      }

      const folderNode = target;
      let openFoldersState = openAncestorFolders(nodes, state.openFolders, folderNode.id);

      const firstFileId = folderNode.children.find((childId: NodeId) => {
        const child = nodes[childId];
        return child?.type === "file";
      });

      if (firstFileId) {
        const fileNode = nodes[firstFileId] as FileNode | undefined;
        if (fileNode) {
          openFoldersState = openAncestorFolders(nodes, openFoldersState, fileNode.parentId ?? null);
          const selectId = fileNode.id;
          set((current) => ({
            ...current,
            selectedId: selectId,
            openFolders: openFoldersState,
            selectionOrigin: "route",
            routeTarget: null,
            viewHistory: appendToHistoryIfNew(current.viewHistory, selectId),
          }));

          persistLastViewedFile(selectId);

          return { status: "selected", nodeId: selectId } satisfies SelectByPathResult;
        }
      }

      set((current) => ({
        ...current,
        selectedId: null,
        openFolders: openFoldersState,
        selectionOrigin: "route",
        routeTarget: { path: slugKey || folderNode.id, status: "folder-empty" },
      }));
      return { status: "folder-empty", folderId: folderNode.id } satisfies SelectByPathResult;
    },

    acknowledgeSelectionOrigin: () => {
      set({ selectionOrigin: null });
    },


    refreshTree,

    createFolder: async (parentId, name) => {
      const parentPath = parentId ?? "";
      const safeName = normalizeName(name);
      const newPath = ensureFolderPath(parentPath, safeName);
      const optimisticNode: FolderNode = {
        id: newPath,
        type: "folder",
        name: safeName,
        path: newPath,
        parentId,
        children: [],
        childrenLoaded: true,
      };

      const snapshot = captureTreeSnapshot(createSnapshot(get()));
      set((state) => addNodeToState(state, optimisticNode));

      enqueueMutation({
        description: `create-folder:${newPath}`,
        perform: async () => {
          const response = await fetch("/api/fs/mkdir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prefix: newPath }),
          });
          if (!response.ok) {
            throw new Error(await extractTreeError(response));
          }
        },
        rollback: () => restoreTreeSnapshot(set, snapshot),
      });

      return Promise.resolve();
    },

    createFile: async (parentId, name, initialContent = "") => {
      const parentPath = parentId ?? "";
      const safeName = normalizeName(name);
      const newPath = ensureFilePath(parentPath, safeName);
      const optimisticNode: FileNode = {
        id: newPath,
        type: "file",
        name: basename(newPath),
        path: newPath,
        parentId,
      };

      const snapshot = captureTreeSnapshot(createSnapshot(get()));
      set((state) => addNodeToState(state, optimisticNode));

      enqueueMutation({
        description: `create-file:${newPath}`,
        perform: async () => {
          const response = await fetch("/api/fs/file", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: newPath, content: initialContent }),
          });
          if (!response.ok) {
            throw new Error(await extractTreeError(response));
          }
          const data = (await response.json().catch(() => ({}))) as { etag?: string };
          if (data?.etag) {
            set((state) => ({
              nodes: {
                ...state.nodes,
                [newPath]: {
                  ...(state.nodes[newPath] as FileNode),
                  etag: data.etag,
                },
              },
            }));
          }
        },
        rollback: () => restoreTreeSnapshot(set, snapshot),
      });

      return Promise.resolve();
    },

    renameNode: async (id, newName) => {
      const node = get().nodes[id];
      if (!node) {
        return;
      }
      const parentPath = node.parentId ?? "";
      const safeName = normalizeName(newName);
      const targetPath = node.type === "folder"
        ? ensureFolderPath(parentPath, safeName)
        : ensureFilePath(parentPath, safeName);
      queueMove(id, targetPath);
      return Promise.resolve();
    },

    deleteNode: async (id) => {
      const node = get().nodes[id];
      if (!node) {
        return;
      }
      const snapshot = captureTreeSnapshot(createSnapshot(get()));
      set((state) => removeNodeFromState(state, id));

      enqueueMutation({
        description: `delete:${id}`,
        perform: async () => {
          if (node.type === "folder") {
            const response = await fetch("/api/fs/folder", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prefix: node.path, recursive: true }),
            });
            if (!response.ok && response.status !== 204) {
              throw new Error(await extractTreeError(response));
            }
            await removePersistentDocumentsWithPrefix(node.path);
          } else {
            const response = await fetch("/api/fs/file", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: node.path, ifMatchEtag: node.etag }),
            });
            if (!response.ok && response.status !== 204) {
              throw new Error(await extractTreeError(response));
            }
            await removePersistentDocument(node.path);
          }
        },
        rollback: () => restoreTreeSnapshot(set, snapshot),
      });

      return Promise.resolve();
    },

    moveNode: async (id, targetParentId) => {
      const node = get().nodes[id];
      if (!node) {
        return;
      }
      const parentPath = targetParentId ?? "";
      const targetPath = node.type === "folder"
        ? ensureFolderPath(parentPath, node.name)
        : ensureFilePath(parentPath, node.name);
      queueMove(id, targetPath);
      return Promise.resolve();
    },

    pushToHistory: (id) => {
      set((state) => {
        const updated = appendToHistoryIfNew(state.viewHistory, id);
        return updated === state.viewHistory ? state : { viewHistory: updated };
      });

      persistLastViewedFile(id);
    },

    removeFromHistory: (id) => {
      set((state) => ({
        viewHistory: state.viewHistory.filter((historyId) => historyId !== id),
      }));
    },

    getPreviousInHistory: () => {
      const state = get();
      const history = state.viewHistory;
      const currentId = state.selectedId;
      // Find the last entry that's not the current selection and still exists
      for (let i = history.length - 1; i >= 0; i--) {
        const id = history[i];
        if (id !== currentId && state.nodes[id]) {
          return id;
        }
      }
      return null;
    },
  };
});

export type TreeStore = typeof useTreeStore;
