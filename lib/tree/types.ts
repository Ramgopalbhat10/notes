export type NodeId = string;

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

export type RefreshState = "idle" | "pending" | "running";
export type RefreshSource = "manual" | "silent" | "mutation" | null;

export type SelectByPathResult =
  | { status: "pending" }
  | { status: "cleared" }
  | { status: "selected"; nodeId: NodeId }
  | { status: "folder-empty"; folderId: NodeId }
  | { status: "missing"; path: string };

export type TreeSnapshot = {
  nodes: Record<NodeId, Node>;
  rootIds: NodeId[];
  openFolders: Record<NodeId, boolean>;
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
  selectedId: NodeId | null;
  routeTarget: RouteTargetState;
  selectionOrigin: SelectionOrigin;
};
