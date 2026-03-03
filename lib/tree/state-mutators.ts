import type { Node, NodeId } from "@/lib/tree/types";
import { buildSlugState, removeNodesWithPrefix } from "@/lib/tree/utils";

type MutableTreeStateShape = {
  nodes: Record<NodeId, Node>;
  rootIds: NodeId[];
  openFolders: Record<NodeId, boolean>;
  selectedId: NodeId | null;
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
};

export function addNodeToState<TState extends MutableTreeStateShape>(state: TState, node: Node): TState {
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
        children: Array.from(children).sort((a, b) => a.localeCompare(b)),
        childrenLoaded: true,
      };
    }
    openFolders[node.parentId] = true;
  } else {
    rootIds = Array.from(new Set([...state.rootIds, node.id])).sort((a, b) => a.localeCompare(b));
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

export function removeNodeFromState<TState extends MutableTreeStateShape>(state: TState, id: NodeId): TState {
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
