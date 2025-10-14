import type { NodeId } from "@/stores/tree";

export type MatchMeta = {
  include: boolean;
  matchesSelf: boolean;
  hasMatchingChild: boolean;
};

export type ModalState =
  | { type: "create-folder"; parentId: NodeId | null }
  | { type: "create-file"; parentId: NodeId | null }
  | { type: "rename"; nodeId: NodeId; initialName: string; path: string; isFolder: boolean }
  | { type: "move"; nodeId: NodeId; currentParentId: NodeId | null; path: string; isFolder: boolean }
  | { type: "delete"; nodeId: NodeId; name: string; path: string; isFolder: boolean };

export const INDENT_SIZE = 16;
