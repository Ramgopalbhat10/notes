"use client";

import { create } from "zustand";

import { normalizeName } from "@/lib/fs-validation";
import type { FileTreeManifest } from "@/lib/file-tree-manifest";
import { isFolderNode } from "@/lib/file-tree-manifest";
import { useEditorStore } from "@/stores/editor";

type ContinuationToken = string | null | undefined;

type ListingResponse = {
  prefix: string;
  folders: string[];
  files: {
    key: string;
    etag?: string;
    lastModified?: string;
    size?: number;
  }[];
  nextContinuationToken: ContinuationToken;
};

export type NodeId = string;

type RefreshState = "idle" | "running";
type RefreshSource = "manual" | "silent" | null;

export type FileNode = {
  id: NodeId;
  type: "file";
  name: string;
  path: string;
  parentId: NodeId | null;
  etag?: string;
  lastModified?: string;
  size?: number;
};

export type FolderNode = {
  id: NodeId;
  type: "folder";
  name: string;
  path: string;
  parentId: NodeId | null;
  children: NodeId[];
  childrenLoaded: boolean;
  lastModified?: string;
};

export type Node = FileNode | FolderNode;

export type RouteTargetState = {
  path: string;
  status: "missing" | "folder-empty";
} | null;

export type SelectionOrigin = "user" | "route" | null;

export type SelectByPathResult =
  | { status: "pending" }
  | { status: "cleared" }
  | { status: "selected"; nodeId: NodeId }
  | { status: "folder-empty"; folderId: NodeId }
  | { status: "missing"; path: string };

export const ROOT_PARENT_KEY = "__root__";

type TreeState = {
  nodes: Record<NodeId, Node>;
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
  refreshQueued: boolean;

  initRoot: () => Promise<void>;
  toggleFolder: (id: NodeId) => Promise<void>;
  select: (id: NodeId) => void;
  selectByPath: (path: string | null) => SelectByPathResult;
  acknowledgeSelectionOrigin: () => void;
  refreshFolder: (
    id: NodeId | null,
    options?: { force?: boolean; mode?: "manifest" | "s3" },
  ) => Promise<void>;
  refreshTree: (options?: { silent?: boolean }) => Promise<void>;
  createFolder: (parentId: NodeId | null, name: string) => Promise<void>;
  createFile: (parentId: NodeId | null, name: string, initialContent?: string) => Promise<void>;
  renameNode: (id: NodeId, newName: string) => Promise<void>;
  deleteNode: (id: NodeId) => Promise<void>;
  moveNode: (id: NodeId, targetParentId: NodeId | null) => Promise<void>;
};

function parentKey(id: NodeId | null): string {
  return id ?? ROOT_PARENT_KEY;
}

function basename(path: string): string {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  const idx = trimmed.lastIndexOf("/");
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

async function fetchFolder(prefix: string): Promise<Pick<ListingResponse, "folders" | "files">> {
  const accumulatedFolders = new Set<string>();
  const files: ListingResponse["files"] = [];
  let continuation: ContinuationToken = null;

  do {
    const params = new URLSearchParams();
    if (prefix) {
      params.set("prefix", prefix);
    }
    if (continuation) {
      params.set("continuationToken", continuation);
    }

    const response = await fetch(`/api/fs/list${params.size ? `?${params.toString()}` : ""}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = typeof body?.error === "string" ? body.error : "Failed to load folder";
      throw new Error(message);
    }

    const data = (await response.json()) as ListingResponse;
    data.folders.forEach((folder) => accumulatedFolders.add(folder));
    files.push(...data.files);
    continuation = data.nextContinuationToken;
  } while (continuation);

  return { folders: Array.from(accumulatedFolders), files };
}

function ensureFolderPath(parentPath: string, name: string) {
  return `${parentPath}${name}/`;
}

function ensureFilePath(parentPath: string, name: string) {
  const normalized = name.toLowerCase().endsWith(".md") ? name : `${name}.md`;
  return `${parentPath}${normalized}`;
}

function removeNodesWithPrefix(nodes: Record<NodeId, Node>, prefix: string) {
  Object.keys(nodes).forEach((key) => {
    if (key.startsWith(prefix)) {
      delete nodes[key];
    }
  });
}

function applyListing(
  state: TreeState,
  parentId: NodeId | null,
  prefix: string,
  listing: Pick<ListingResponse, "folders" | "files">,
): TreeState {
  const nodes = { ...state.nodes };
  const folderIds: NodeId[] = [];
  const fileIds: NodeId[] = [];

  listing.folders.forEach((folderName) => {
    const path = `${prefix}${folderName}`;
    folderIds.push(path);
    const existing = nodes[path];
    nodes[path] = {
      id: path,
      type: "folder",
      name: basename(path),
      path,
      parentId,
      children: existing && existing.type === "folder" ? existing.children : [],
      childrenLoaded: existing && existing.type === "folder" ? existing.childrenLoaded : false,
      lastModified: existing?.lastModified,
    } satisfies FolderNode;
  });

  listing.files.forEach((file) => {
    const path = file.key;
    fileIds.push(path);
    nodes[path] = {
      id: path,
      type: "file",
      name: basename(path),
      path,
      parentId: parentPathFromKey(path),
      etag: file.etag,
      lastModified: file.lastModified,
      size: file.size,
    } satisfies FileNode;
  });

  const children = [...folderIds, ...fileIds].sort();

  if (parentId) {
    const parentNode = nodes[parentId];
    if (parentNode && parentNode.type === "folder") {
      parentNode.children = children;
      parentNode.childrenLoaded = true;
    }
  }

  const rootIds = parentId ? state.rootIds : children;
  const { slugToId, idToSlug } = buildSlugState(nodes);

  return {
    ...state,
    nodes,
    rootIds,
    slugToId,
    idToSlug,
  };
}

function parentPathFromKey(key: string): NodeId | null {
  const idx = key.lastIndexOf("/");
  if (idx === -1) {
    return null;
  }
  return key.slice(0, idx + 1);
}

function parentPathFromFolderKey(key: string): NodeId | null {
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  if (!trimmed) {
    return null;
  }
  const idx = trimmed.lastIndexOf("/");
  if (idx === -1) {
    return null;
  }
  return `${trimmed.slice(0, idx + 1)}`;
}

function openAncestorFolders(
  nodes: Record<NodeId, Node>,
  openFolders: Record<NodeId, boolean>,
  startId: NodeId | null,
): Record<NodeId, boolean> {
  const updated = { ...openFolders };
  if (!startId) {
    return updated;
  }
  const visited = new Set<NodeId>();
  let current: NodeId | null = startId;
  while (current && !visited.has(current)) {
    visited.add(current);
    updated[current] = true;
    const node = nodes[current] as Node | undefined;
    if (!node || node.type !== "folder") {
      break;
    }
    current = node.parentId;
  }
  return updated;
}

function pathSegmentsForSlug(path: string): string[] {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  if (!trimmed) {
    return [];
  }
  return trimmed.split("/");
}

function slugifySegment(segment: string, stripExtension: boolean): string {
  let value = segment;
  if (stripExtension) {
    value = value.replace(/\.md$/i, "");
  }
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

function buildSlugPath(node: Node): string {
  const segments = pathSegmentsForSlug(node.path);
  if (segments.length === 0) {
    return node.type === "folder" ? "" : "";
  }
  const slugSegments = segments.map((segment, index) => {
    const isFileSegment = node.type === "file" && index === segments.length - 1;
    return slugifySegment(segment, isFileSegment);
  });
  let slug = slugSegments.join("/");
  if (node.type === "folder" && slug) {
    slug = `${slug}/`;
  }
  return slug;
}

function buildSlugState(nodes: Record<NodeId, Node>): {
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
} {
  const slugToId: Record<string, NodeId> = {};
  const idToSlug: Record<NodeId, string> = {};

  Object.values(nodes).forEach((node) => {
    const baseSlug = buildSlugPath(node);
    if (!baseSlug) {
      idToSlug[node.id] = node.id;
      return;
    }
    let slug = baseSlug;
    let counter = 2;
    while (slugToId[slug] && slugToId[slug] !== node.id) {
      if (node.type === "folder") {
        const folderSlug = baseSlug.replace(/\/$/, "");
        slug = `${folderSlug}-${counter}/`;
      } else {
        slug = `${baseSlug}-${counter}`;
      }
      counter += 1;
    }
    slugToId[slug] = node.id;
    idToSlug[node.id] = slug;
  });

  return { slugToId, idToSlug };
}

function addNodeToState(state: TreeState, node: Node): TreeState {
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
        children: parent.children.filter((childId) => childId !== id),
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

function sanitizeEtag(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.replace(/^W\//i, "").replace(/"/g, "");
}

function formatIfNoneMatch(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return `"${value}"`;
}

function filterOpenFolders(
  openFolders: Record<NodeId, boolean>,
  nodes: Record<NodeId, Node>,
): Record<NodeId, boolean> {
  const result: Record<NodeId, boolean> = {};
  Object.entries(openFolders).forEach(([id, isOpen]) => {
    const node = nodes[id];
    if (node && node.type === "folder") {
      result[id] = isOpen;
    }
  });
  return result;
}

function buildStateFromManifest(manifest: FileTreeManifest): {
  nodes: Record<NodeId, Node>;
  rootIds: NodeId[];
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
} {
  const nodes: Record<NodeId, Node> = {};

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

async function fetchManifest(
  etag: string | null,
  force: boolean,
): Promise<{ manifest?: FileTreeManifest; etag?: string | null }> {
  const headers = new Headers();
  if (!force) {
    const headerValue = formatIfNoneMatch(etag);
    if (headerValue) {
      headers.set("If-None-Match", headerValue);
    }
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
    throw new Error(await extractError(response));
  }

  const manifest = (await response.json()) as FileTreeManifest;
  const nextEtag = sanitizeEtag(response.headers.get("ETag"));
  return { manifest, etag: nextEtag };
}

async function extractError(response: Response): Promise<string> {
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

  const refreshTree = async (options?: { silent?: boolean }) => {
    const source: RefreshSource = options?.silent ? "silent" : "manual";
    if (get().refreshState !== "idle") {
      set({ refreshQueued: true });
      return;
    }

    set({
      refreshState: "running",
      refreshError: null,
      refreshLastSource: source,
      refreshQueued: false,
    });

    try {
      const response = await fetch("/api/tree/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      await loadManifest({ force: true });
      set({
        refreshState: "idle",
        refreshSuccessAt: new Date().toISOString(),
        refreshError: null,
        refreshLastSource: source,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh file tree";
      set({
        refreshState: "idle",
        refreshError: message,
        refreshLastSource: source,
      });
    } finally {
      const { refreshQueued } = get();
      if (refreshQueued) {
        set({ refreshQueued: false });
        void refreshTree({ silent: true });
      }
    }
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
    refreshQueued: false,

    initRoot: async () => {
      const state = get();
      if (state.initialized || state.loadingByParent[parentKey(null)]) {
        return;
      }
      await loadManifest({ force: true });
      set({ initialized: true });
    },

    toggleFolder: async (id) => {
      const node = get().nodes[id];
      if (!node || node.type !== "folder") {
        return;
      }
      const isOpen = get().openFolders[id] ?? false;
      set((state) => ({
        openFolders: { ...state.openFolders, [id]: !isOpen },
      }));

      if (!isOpen && !node.childrenLoaded) {
        await get().refreshFolder(id);
      }
    },

    select: (id) => {
      const node = get().nodes[id];
      if (!node || node.type !== "file") {
        return;
      }
      const editorState = useEditorStore.getState();
      if (
        editorState.fileKey &&
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
      set({ selectedId: id, selectionOrigin: "user", routeTarget: null });
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

      const slugSegments = segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return slugifySegment(segment, isLast && !hasTrailingSlash);
      });
      const baseSlug = slugSegments.join("/");
      const slugKey = hasTrailingSlash ? (baseSlug ? `${baseSlug}/` : "") : baseSlug;

      const nodes = state.nodes;
      let target: Node | undefined;
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
          };
        });
        return { status: "selected", nodeId: target.id } satisfies SelectByPathResult;
      }

      const folderNode = target;
      let openFoldersState = openAncestorFolders(nodes, state.openFolders, folderNode.id);

      const firstFileId = folderNode.children.find((childId) => {
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
          }));
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

    refreshFolder: async (id, options) => {
      const strategy = options?.mode ?? (id === null ? "manifest" : "s3");
      if (id === null && strategy === "manifest") {
        await loadManifest({ force: options?.force ?? false });
        return;
      }

      const prefix = id ?? "";
      const key = parentKey(id);

      set((state) => ({
        loadingByParent: { ...state.loadingByParent, [key]: true },
        errorByParent: { ...state.errorByParent, [key]: null },
      }));

      try {
        const { folders, files } = await fetchFolder(prefix);
        set((state) => ({
          ...applyListing(state, id, prefix, { folders, files }),
          loadingByParent: { ...state.loadingByParent, [key]: false },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load folder";
        set((state) => ({
          loadingByParent: { ...state.loadingByParent, [key]: false },
          errorByParent: { ...state.errorByParent, [key]: message },
        }));
      }
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
        childrenLoaded: false,
      };

      const snapshot = get();
      set((state) => addNodeToState(state, optimisticNode));

      try {
        const response = await fetch("/api/fs/mkdir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefix: newPath }),
        });
        if (!response.ok) {
          throw new Error(await extractError(response));
        }
        const refreshOptions = parentId
          ? { force: true }
          : ({ force: true, mode: "s3" as const });
        await get().refreshFolder(parentId ?? null, refreshOptions);
        void refreshTree({ silent: true });
      } catch (error) {
        set({
          nodes: snapshot.nodes,
          rootIds: snapshot.rootIds,
          openFolders: snapshot.openFolders,
          selectedId: snapshot.selectedId,
          selectionOrigin: snapshot.selectionOrigin,
          routeTarget: snapshot.routeTarget,
          slugToId: snapshot.slugToId,
          idToSlug: snapshot.idToSlug,
        });
        throw error;
      }
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

      const snapshot = get();
      set((state) => addNodeToState(state, optimisticNode));

      try {
        const response = await fetch("/api/fs/file", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: newPath, content: initialContent }),
        });
        if (!response.ok) {
          throw new Error(await extractError(response));
        }
        const data = (await response.json()) as { etag?: string };
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
        const refreshOptions = parentId
          ? { force: true }
          : ({ force: true, mode: "s3" as const });
        await get().refreshFolder(parentId ?? null, refreshOptions);
        void refreshTree({ silent: true });
      } catch (error) {
        set({
          nodes: snapshot.nodes,
          rootIds: snapshot.rootIds,
          openFolders: snapshot.openFolders,
          selectedId: snapshot.selectedId,
          selectionOrigin: snapshot.selectionOrigin,
          routeTarget: snapshot.routeTarget,
          slugToId: snapshot.slugToId,
          idToSlug: snapshot.idToSlug,
        });
        throw error;
      }
    },

    renameNode: async (id, newName) => {
      const node = get().nodes[id];
      if (!node) {
        return;
      }
      const parentId = node.parentId;
      const parentPath = parentId ?? "";
      const safeName = normalizeName(newName);
      const targetPath = node.type === "folder"
        ? ensureFolderPath(parentPath, safeName)
        : ensureFilePath(parentPath, safeName);
      await performMove(id, targetPath);
    },

    deleteNode: async (id) => {
      const node = get().nodes[id];
      if (!node) {
        return;
      }
      const snapshot = get();
      set((state) => removeNodeFromState(state, id));

      try {
        if (node.type === "folder") {
          const response = await fetch("/api/fs/folder", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prefix: node.path, recursive: true }),
          });
          if (!response.ok && response.status !== 204) {
            throw new Error(await extractError(response));
          }
        } else {
          const response = await fetch("/api/fs/file", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: node.path, ifMatchEtag: node.etag }),
          });
          if (!response.ok && response.status !== 204) {
            throw new Error(await extractError(response));
          }
        }
        const refreshOptions = node.parentId
          ? { force: true }
          : ({ force: true, mode: "s3" as const });
        await get().refreshFolder(node.parentId ?? null, refreshOptions);
        void refreshTree({ silent: true });
      } catch (error) {
        set({
          nodes: snapshot.nodes,
          rootIds: snapshot.rootIds,
          openFolders: snapshot.openFolders,
          selectedId: snapshot.selectedId,
          selectionOrigin: snapshot.selectionOrigin,
          routeTarget: snapshot.routeTarget,
          slugToId: snapshot.slugToId,
          idToSlug: snapshot.idToSlug,
        });
        throw error;
      }
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
      await performMove(id, targetPath);
    },
  };
});

async function performMove(id: NodeId, targetPath: string) {
  const state = useTreeStore.getState();
  const node = state.nodes[id];
  if (!node) {
    return;
  }

  const newPath = targetPath;

  if (node.path === newPath) {
    return;
  }

  const newParentId = node.type === "folder"
    ? parentPathFromFolderKey(newPath)
    : parentPathFromKey(newPath);
  const newName = basename(newPath);

  const snapshot = useTreeStore.getState();
  useTreeStore.setState((current) => removeNodeFromState(current, id));

  try {
    const body: Record<string, unknown> = {
      fromKey: node.path,
      toKey: newPath,
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
      throw new Error(await extractError(response));
    }
    const data = await response.json().catch(() => ({}));
    const updatedNode: Node = node.type === "folder"
      ? {
          ...node,
          id: newPath,
          path: newPath,
          name: newName,
          parentId: newParentId,
        }
      : {
          ...node,
          id: newPath,
          path: newPath,
          name: newName,
          parentId: newParentId,
          ...(data?.etag ? { etag: data.etag } : {}),
        };
    useTreeStore.setState((current) => {
      const next = addNodeToState(current, updatedNode);
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
    const refreshOptionsForOldParent = node.parentId
      ? { force: true }
      : ({ force: true, mode: "s3" as const });
    await useTreeStore.getState().refreshFolder(node.parentId ?? null, refreshOptionsForOldParent);
    if (newParentId !== node.parentId) {
      const refreshOptionsForNewParent = newParentId
        ? { force: true }
        : ({ force: true, mode: "s3" as const });
      await useTreeStore.getState().refreshFolder(newParentId ?? null, refreshOptionsForNewParent);
    }
    void useTreeStore.getState().refreshTree({ silent: true });
  } catch (error) {
    useTreeStore.setState({
      nodes: snapshot.nodes,
      rootIds: snapshot.rootIds,
      openFolders: snapshot.openFolders,
      selectedId: snapshot.selectedId,
      selectionOrigin: snapshot.selectionOrigin,
      routeTarget: snapshot.routeTarget,
      slugToId: snapshot.slugToId,
      idToSlug: snapshot.idToSlug,
    });
    throw error;
  }
}
