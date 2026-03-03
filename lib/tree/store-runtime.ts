import type {
  Node as TreeNode,
  NodeId,
  RouteTargetState,
  SelectionOrigin,
  TreeSnapshot,
} from "@/lib/tree/types";

export type EditorStoreHook = typeof import("@/stores/editor")['useEditorStore'];

const EDITOR_STORE_GLOBAL_KEY = "__MRGB_EDITOR_STORE__";

type SnapshotSource = {
  nodes: Record<NodeId, TreeNode>;
  rootIds: NodeId[];
  openFolders: Record<NodeId, boolean>;
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
  selectedId: NodeId | null;
  routeTarget: RouteTargetState;
  selectionOrigin: SelectionOrigin;
};

export function getEditorStore(): EditorStoreHook | null {
  if (typeof window === "undefined") {
    return null;
  }

  const globalWindow = window as typeof window & { [EDITOR_STORE_GLOBAL_KEY]?: EditorStoreHook };
  if (globalWindow[EDITOR_STORE_GLOBAL_KEY]) {
    return globalWindow[EDITOR_STORE_GLOBAL_KEY] ?? null;
  }

  void import("@/stores/editor")
    .then((module) => {
      globalWindow[EDITOR_STORE_GLOBAL_KEY] = module.useEditorStore;
    })
    .catch(() => {
      // ignore load failures; selection will proceed without dirty guard
    });

  return globalWindow[EDITOR_STORE_GLOBAL_KEY] ?? null;
}

export function createSnapshot(state: SnapshotSource): TreeSnapshot {
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
