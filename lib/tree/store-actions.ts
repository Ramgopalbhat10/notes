import type { Node, NodeId } from "@/lib/tree/types";
import { basename, ensureFilePath, ensureFolderPath, getParentPath } from "@/lib/tree/utils";

export function resolveNodeTargetPath(node: Node, parentPath: string, name: string): string {
  return node.type === "folder"
    ? ensureFolderPath(parentPath, name)
    : ensureFilePath(parentPath, name);
}

export function getPreviousHistorySelection(
  history: NodeId[],
  currentId: NodeId | null,
  nodes: Record<NodeId, Node>,
): NodeId | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const id = history[i];
    if (id !== currentId && nodes[id]) {
      return id;
    }
  }

  return null;
}

export function prepareQueuedMoveNode(node: Node, targetPath: string): Node {
  return {
    ...node,
    id: targetPath,
    path: targetPath,
    name: basename(targetPath),
    parentId: getParentPath(targetPath),
  };
}

export function buildMoveMutationRequest(
  node: Node,
  targetPath: string,
): { fromKey: string; toKey: string; type: "file" | "folder"; ifMatchEtag?: string } {
  if (node.type === "file" && node.etag) {
    return {
      fromKey: node.path,
      toKey: targetPath,
      type: node.type,
      ifMatchEtag: node.etag,
    };
  }

  return {
    fromKey: node.path,
    toKey: targetPath,
    type: node.type,
  };
}
