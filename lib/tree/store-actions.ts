import type { Node, NodeId } from "@/lib/tree/types";
import { ensureFilePath, ensureFolderPath } from "@/lib/tree/utils";

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
