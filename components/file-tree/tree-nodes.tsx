"use client";

import {
  ChevronRight,
  Download,
  Edit,
  FilePlus2,
  FolderPlus,
  MoveRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { useTreeStore, type Node, type NodeId } from "@/stores/tree";
import { INDENT_SIZE, type MatchMeta, type ModalState } from "./types";
import { useToast } from "@/hooks/use-toast";

function makeNodeActions(
  openModal: (modal: ModalState) => void,
  node: Node,
  options: { isFolder: boolean; displayName?: string },
) {
  const name = options.displayName ?? node.name;
  return {
    rename: () =>
      openModal({
        type: "rename",
        nodeId: node.id,
        initialName: name,
        path: node.path,
        isFolder: options.isFolder,
      }),
    remove: () =>
      openModal({
        type: "delete",
        nodeId: node.id,
        name,
        path: node.path,
        isFolder: options.isFolder,
      }),
    move: () =>
      openModal({
        type: "move",
        nodeId: node.id,
        currentParentId: node.parentId,
        path: node.path,
        isFolder: options.isFolder,
      }),
  } as const;
}

export type TreeNodeProps = {
  id: NodeId;
  depth: number;
  selectedId: NodeId | null;
  filterActive: boolean;
  matchMap: Map<NodeId, MatchMeta> | null;
  activeId: NodeId | null;
  onActiveChange: (id: NodeId) => void;
  openModal: (modal: ModalState) => void;
  posInSet?: number;
  setSize?: number;
};

export function TreeNode({
  id,
  depth,
  selectedId,
  filterActive,
  matchMap,
  activeId,
  onActiveChange,
  openModal,
  posInSet,
  setSize,
}: TreeNodeProps) {
  const node = useTreeStore((state) => state.nodes[id]);
  if (!node) {
    return null;
  }
  if (filterActive && matchMap && !matchMap.get(id)?.include) {
    return null;
  }
  if (node.type === "folder") {
    return (
      <FolderNode
        node={node}
        depth={depth}
        selectedId={selectedId}
        filterActive={filterActive}
        matchMap={matchMap}
        activeId={activeId}
        onActiveChange={onActiveChange}
        openModal={openModal}
        posInSet={posInSet}
        setSize={setSize}
      />
    );
  }
  return (
    <FileNode
      node={node}
      depth={depth}
      selectedId={selectedId}
      onActiveChange={onActiveChange}
      openModal={openModal}
      posInSet={posInSet}
      setSize={setSize}
    />
  );
}

type FolderNodeProps = {
  node: Extract<Node, { type: "folder" }>;
  depth: number;
  selectedId: NodeId | null;
  filterActive: boolean;
  matchMap: Map<NodeId, MatchMeta> | null;
  activeId: NodeId | null;
  onActiveChange: (id: NodeId) => void;
  openModal: (modal: ModalState) => void;
  posInSet?: number;
  setSize?: number;
};

function FolderNode({
  node,
  depth,
  selectedId,
  filterActive,
  matchMap,
  activeId,
  onActiveChange,
  openModal,
  posInSet,
  setSize,
}: FolderNodeProps) {
  const toggleFolder = useTreeStore((state) => state.toggleFolder);
  const isOpenState = useTreeStore((state) => state.openFolders[node.id] ?? false);
  const selectedNode = useTreeStore((state) => state.selectedId ? state.nodes[state.selectedId] : null);

  const matches = filterActive && matchMap ? matchMap.get(node.id) : undefined;
  const shouldForceOpen = filterActive && Boolean(matches?.include);
  const isOpen = shouldForceOpen || isOpenState;
  const childIds = filterActive && matchMap
    ? node.children.filter((childId) => matchMap.get(childId)?.include)
    : node.children;
  const isActive = node.id === activeId;
  const prefix = node.path.endsWith("/") ? node.path : node.path + "/";
  const isAncestor = selectedNode && selectedNode.path.startsWith(prefix);
  const selectionState = selectedId === node.id ? "selected" : null;
  const showActions = isActive;
  const connectorLeft = depth * INDENT_SIZE + 10;

  const handleToggle = () => {
    onActiveChange(node.id);
    if (filterActive) {
      return;
    }
    void toggleFolder(node.id);
  };

  const handleCreateFolder = () => openModal({ type: "create-folder", parentId: node.id });
  const handleCreateFile = () => openModal({ type: "create-file", parentId: node.id });
  const { rename: handleRename, remove: handleDelete, move: handleMove } = makeNodeActions(openModal, node, { isFolder: true });

  return (
    <div className="rounded-md">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group/folder relative flex items-center rounded-md px-1 transition-colors min-w-0 overflow-hidden",
              (selectionState === "selected" || isActive)
                ? "bg-sidebar-accent text-foreground"
                : "hover:bg-muted/20 focus-within:bg-muted/20",
            )}
            style={{ paddingLeft: depth * INDENT_SIZE }}
          >
            <button
              type="button"
              data-node-id={node.id}
              onClick={handleToggle}
              className={cn(
                "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                isActive || selectionState === "selected" ? "text-foreground font-medium" : "text-muted-foreground/60",
                isAncestor ? "text-foreground font-medium" : ""
              )}
              role="treeitem"
              aria-expanded={isOpen}
              aria-selected={isActive}
              aria-level={depth + 1}
              aria-posinset={posInSet}
              aria-setsize={setSize}
              title={node.name}
            >
              <span className="inline-flex shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen ? "rotate-90" : "")} />
              </span>
              <span className="truncate">{node.name || "(untitled)"}</span>
            </button>
            <div
              className={cn(
                "absolute right-0 inset-y-0 flex items-center",
                "opacity-0 transition-opacity pointer-events-none",
                "group-hover/folder:opacity-100 group-hover/folder:pointer-events-auto",
                "group-focus-within/folder:opacity-100 group-focus-within/folder:pointer-events-auto",
                showActions && "opacity-100 pointer-events-auto",
              )}
            >
              {/* Gradient-only fade strip — no pointer events, just masks text */}
              <div className={cn(
                "w-10 h-full pointer-events-none bg-gradient-to-r from-transparent",
                (selectionState === "selected" || isActive)
                  ? "to-sidebar-accent"
                  : "to-sidebar group-hover/folder:to-[color-mix(in_oklch,var(--color-muted)_20%,var(--color-sidebar))]" 
              )} />
              {/* Solid icon container — bg matches row state so no color patch over selection */}
              <div className={cn(
                "flex items-center gap-1 pr-1 pl-0.5 h-full",
                (selectionState === "selected" || isActive)
                  ? "bg-sidebar-accent"
                  : "bg-sidebar group-hover/folder:bg-[color-mix(in_oklch,var(--color-muted)_20%,var(--color-sidebar))]" 
              )}>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="New folder"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCreateFolder();
                  }}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="New file"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCreateFile();
                  }}
                >
                  <FilePlus2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-60 min-w-[15rem]">
          <ContextMenuItem onSelect={handleToggle}>
            <ChevronRight className="mr-2 h-4 w-4" />
            Open
            <ContextMenuShortcut>Enter</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleCreateFile}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            New File
            <ContextMenuShortcut>⌘N</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCreateFolder}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
            <ContextMenuShortcut>⇧⌘N</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleRename}>
            <Edit className="mr-2 h-4 w-4" />
            Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleMove}>
            <MoveRight className="mr-2 h-4 w-4" />
            Move…
            <ContextMenuShortcut>⇧⌘M</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={handleDelete}
            className="rounded-md bg-destructive/80 text-destructive-foreground transition-colors hover:bg-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
            <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isOpen ? (
        <div className="relative" aria-live="polite" role="group">
          {childIds.length > 0 ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute ml-1 bottom-0 top-0 z-10 border-l border-border/40"
              style={{ left: connectorLeft }}
            />
          ) : null}
          <div className="space-y-1">
            {childIds.length === 0 ? (
              <div
                className="py-1 text-xs text-muted-foreground"
                style={{ marginLeft: (depth + 1) * INDENT_SIZE + 12 }}
              >
                Empty folder
              </div>
            ) : null}

            {childIds.map((childId, index) => (
              <TreeNode
                key={childId}
                id={childId}
                depth={depth + 1}
                selectedId={selectedId}
                filterActive={filterActive}
                matchMap={matchMap}
                activeId={activeId}
                onActiveChange={onActiveChange}
                openModal={openModal}
                posInSet={index + 1}
                setSize={childIds.length}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type FileNodeProps = {
  node: Extract<Node, { type: "file" }>;
  depth: number;
  selectedId: NodeId | null;
  onActiveChange: (id: NodeId) => void;
  openModal: (modal: ModalState) => void;
  posInSet?: number;
  setSize?: number;
};

function FileNode({
  node,
  depth,
  selectedId,
  onActiveChange,
  openModal,
  posInSet,
  setSize,
}: FileNodeProps) {
  const select = useTreeStore((state) => state.select);
  const { toast } = useToast();

  const isSelected = node.id === selectedId;

  const displayName = node.name.replace(/\.md$/i, "");

  const { rename: handleRename, remove: handleDelete, move: handleMove } = makeNodeActions(openModal, node, { isFolder: false, displayName });

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/fs/file?key=${encodeURIComponent(node.path)}`);
      if (!response.ok) {
        let message = response.statusText;
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message || "Failed to download file");
      }
      const data = (await response.json()) as { content: string };
      const blob = new Blob([data.content ?? ""], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = node.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download file";
      toast({ title: "Download failed", description: message, variant: "destructive" });
    }
  };

  const handleOpen = () => {
    onActiveChange(node.id);
    select(node.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          data-node-id={node.id}
          onClick={handleOpen}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isSelected
              ? "bg-muted text-foreground font-medium"
              : "hover:bg-muted/20 text-muted-foreground/60",
          )}
          style={{ paddingLeft: depth * INDENT_SIZE + INDENT_SIZE }}
          role="treeitem"
          aria-selected={isSelected}
          aria-level={depth + 1}
          aria-posinset={posInSet}
          aria-setsize={setSize}
          title={node.name}
        >
          <span className="truncate">{displayName}</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60 min-w-[15rem]">
        <ContextMenuItem onSelect={handleOpen}>
          <ChevronRight className="mr-2 h-4 w-4" />
          Open
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => void handleDownload()}>
          <Download className="mr-2 h-4 w-4" />
          Download
          <ContextMenuShortcut>⌘S</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleRename}>
          <Edit className="mr-2 h-4 w-4" />
          Rename
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleMove}>
          <MoveRight className="mr-2 h-4 w-4" />
          Move…
          <ContextMenuShortcut>⇧⌘M</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={handleDelete}
          className="rounded-md bg-destructive/80 text-destructive-foreground transition-colors hover:bg-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
          <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
