"use client";

import { create } from "zustand";

import { normalizeName } from "@/lib/fs/fs-validation";
import type { FileTreeManifest } from "@/lib/file-tree-manifest";
import { getErrorMessage } from "@/lib/http/client";
import {
  removePersistentDocument,
  removePersistentDocumentsWithPrefix,
} from "@/lib/platform/persistent-document-cache";
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
  removeNodesWithPrefix,
} from "@/lib/tree/utils";
import {
  createManifestRefresher,
  fetchManifest,
} from "@/lib/tree/manifest-client";
import {
  createFileRequest,
  createFolderRequest,
  deleteFileRequest,
  deleteFolderRequest,
  moveNodeRequest,
} from "@/lib/tree/mutation-api";
import { createMutationQueue } from "@/lib/tree/mutation-queue";
import {
  appendToHistoryIfNew,
  buildRouteSlugKey,
  findRouteTargetNode,
  parentKey,
  persistLastViewedFile,
  ROOT_PARENT_KEY,
} from "@/lib/tree/store-selection";
import {
  buildMoveMutationRequest,
  getPreviousHistorySelection,
  prepareQueuedMoveNode,
  resolveNodeTargetPath,
} from "@/lib/tree/store-actions";
import { createSnapshot, getEditorStore } from "@/lib/tree/store-runtime";
import { buildStateFromManifest } from "@/lib/tree/state-from-manifest";
import { addNodeToState, removeNodeFromState } from "@/lib/tree/state-mutators";
import { captureTreeSnapshot, restoreTreeSnapshot } from "@/lib/tree/snapshots";

export type Node = TreeNode;
export type { NodeId, FileNode, FolderNode, SelectByPathResult } from "@/lib/tree/types";
export { ROOT_PARENT_KEY } from "@/lib/tree/store-selection";
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
  expandAll: () => void;
  collapseAll: () => void;
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
      const message = getErrorMessage(error, "Failed to load file tree");
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
    const updatedNode = prepareQueuedMoveNode(node, targetPath);

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
      description: `move:${nodeId}`,
      perform: async () => {
        const body = buildMoveMutationRequest(node, targetPath);
        const data = await moveNodeRequest(body);
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

    expandAll: () => {
      const { nodes } = get();
      const openFolders: Record<NodeId, boolean> = {};
      for (const id in nodes) {
        const node = nodes[id];
        if (node && node.type === "folder") {
          openFolders[id] = true;
        }
      }
      set({ openFolders });
    },

    collapseAll: () => {
      set({ openFolders: {} });
    },

    select: (id) => {
      const node = get().nodes[id];
      if (!node) {
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

      const nodes = state.nodes;
      const { canonicalPath, slugKey } = buildRouteSlugKey(path);
      const target = findRouteTargetNode(nodes, state.slugToId, slugKey, canonicalPath);

      if (!target) {
        const missingSlug = slugKey || canonicalPath;
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
        selectedId: folderNode.id, // Highlight the folder
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
          await createFolderRequest(newPath);
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
          const data = await createFileRequest(newPath, initialContent);
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
      const targetPath = resolveNodeTargetPath(node, parentPath, safeName);
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
            await deleteFolderRequest(node.path);
            await removePersistentDocumentsWithPrefix(node.path);
          } else {
            await deleteFileRequest(node.path, node.etag);
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
      const targetPath = resolveNodeTargetPath(node, parentPath, node.name);
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
      return getPreviousHistorySelection(state.viewHistory, state.selectedId, state.nodes);
    },
  };
});

export type TreeStore = typeof useTreeStore;
