import type { Node, NodeId } from "@/lib/tree/types";

export type MoveBlockReason = "current" | "self" | "descendant" | "collision" | "missing";

export type MoveDestinationResult =
  | { ok: true }
  | { ok: false; reason: MoveBlockReason };

export function listFolderChildIds(
  nodes: Record<NodeId, Node>,
  parentId: NodeId | null,
  rootIds: NodeId[],
): NodeId[] {
  if (parentId === null) {
    return rootIds.filter((id) => nodes[id]?.type === "folder");
  }

  const parent = nodes[parentId];
  if (!parent || parent.type !== "folder") {
    return [];
  }

  return parent.children.filter((id) => nodes[id]?.type === "folder");
}

export function resolveDropParentId(target: Node): NodeId | null {
  if (target.type === "folder") {
    return target.id;
  }
  return target.parentId;
}

export function evaluateMoveDestination(
  sourceId: NodeId,
  destinationParentId: NodeId | null,
  nodes: Record<NodeId, Node>,
): MoveDestinationResult {
  const source = nodes[sourceId];
  if (!source) {
    return { ok: false, reason: "missing" };
  }

  if (destinationParentId === sourceId) {
    return { ok: false, reason: "self" };
  }

  if (destinationParentId === source.parentId) {
    return { ok: false, reason: "current" };
  }

  if (destinationParentId !== null) {
    const destination = nodes[destinationParentId];
    if (!destination || destination.type !== "folder") {
      return { ok: false, reason: "missing" };
    }

    if (source.type === "folder") {
      const sourcePrefix = source.path.endsWith("/") ? source.path : `${source.path}/`;
      if (destination.path === source.path || destination.path.startsWith(sourcePrefix)) {
        return { ok: false, reason: "descendant" };
      }
    }
  }

  const siblings = destinationParentId === null
    ? Object.values(nodes).filter((node) => node.parentId === null)
    : (() => {
        const parent = nodes[destinationParentId];
        if (!parent || parent.type !== "folder") {
          return [];
        }
        return parent.children.map((id) => nodes[id]).filter((node): node is Node => Boolean(node));
      })();

  const nameCollision = siblings.some((sibling) => sibling.id !== source.id && sibling.name === source.name);
  if (nameCollision) {
    return { ok: false, reason: "collision" };
  }

  return { ok: true };
}

export function describeMoveBlockReason(reason: MoveBlockReason): string {
  switch (reason) {
    case "current":
      return "This item is already in that folder.";
    case "self":
      return "A folder can't be moved into itself.";
    case "descendant":
      return "A folder can't be moved into one of its own subfolders.";
    case "collision":
      return "A file or folder with this name already exists there.";
    case "missing":
      return "That folder is no longer available.";
  }
}

export function buildFolderMatchSet(
  nodes: Record<NodeId, Node>,
  query: string,
): Set<NodeId> | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const matched = new Set<NodeId>();
  for (const node of Object.values(nodes)) {
    if (node.type !== "folder" || !node.normalizedSearchText.includes(normalized)) {
      continue;
    }
    matched.add(node.id);
    let parentId = node.parentId;
    while (parentId) {
      matched.add(parentId);
      parentId = nodes[parentId]?.parentId ?? null;
    }
  }

  return matched;
}
