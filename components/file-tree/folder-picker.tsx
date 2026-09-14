"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Folder, FolderOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  buildFolderMatchSet,
  describeMoveBlockReason,
  evaluateMoveDestination,
  listFolderChildIds,
  type MoveBlockReason,
} from "@/lib/tree/move-destination";
import { type Node, type NodeId, useTreeStore } from "@/stores/tree";
import { INDENT_SIZE } from "./types";

type FolderPickerProps = {
  sourceId: NodeId;
  selectedParentId: NodeId | null;
  onSelect: (parentId: NodeId | null) => void;
  formatPathLabel: (path: string | null | undefined) => string;
};

function isSelectableReason(reason: MoveBlockReason | null): boolean {
  return reason === null;
}

function destinationReason(
  sourceId: NodeId,
  destinationParentId: NodeId | null,
  nodes: Record<NodeId, Node>,
): MoveBlockReason | null {
  const result = evaluateMoveDestination(sourceId, destinationParentId, nodes);
  return result.ok ? null : result.reason;
}

export function FolderPicker({
  sourceId,
  selectedParentId,
  onSelect,
  formatPathLabel,
}: FolderPickerProps) {
  const nodes = useTreeStore((state) => state.nodes);
  const rootIds = useTreeStore((state) => state.rootIds);
  const source = nodes[sourceId];
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<NodeId, boolean>>({});

  useEffect(() => {
    const initial: Record<NodeId, boolean> = {};
    let current = source?.parentId ?? null;
    while (current) {
      initial[current] = true;
      current = nodes[current]?.parentId ?? null;
    }
    setOpenFolders(initial);
    setQuery("");
  }, [nodes, source?.parentId, sourceId]);

  const matchSet = useMemo(() => buildFolderMatchSet(nodes, query), [nodes, query]);
  const filterActive = matchSet !== null;
  const rootReason = destinationReason(sourceId, null, nodes);
  const rootSelectable = isSelectableReason(rootReason);
  const childIds = listFolderChildIds(nodes, null, rootIds);
  const visibleRootIds = filterActive
    ? childIds.filter((id) => matchSet.has(id))
    : childIds;

  const toggleFolder = (id: NodeId) => {
    if (filterActive) {
      return;
    }
    setOpenFolders((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter folders"
          aria-label="Filter destination folders"
          className="h-9 rounded-lg border border-border bg-background pr-9 text-sm shadow-sm"
        />
        <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>

      <ScrollArea className="h-64 rounded-lg border border-border/70 bg-muted/10">
        <div className="p-1.5" role="tree" aria-label="Destination folders">
          <button
            type="button"
            role="treeitem"
            aria-selected={selectedParentId === null}
            aria-disabled={!rootSelectable}
            disabled={!rootSelectable}
            title={rootReason ? describeMoveBlockReason(rootReason) : "Vault root"}
            onClick={() => {
              if (rootSelectable) {
                onSelect(null);
              }
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              selectedParentId === null
                ? "bg-sidebar-accent text-foreground"
                : "text-foreground hover:bg-muted/40",
              !rootSelectable && "cursor-not-allowed opacity-50 hover:bg-transparent",
            )}
          >
            <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-medium">Vault</span>
            {rootReason === "current" ? (
              <span className="text-[11px] text-muted-foreground">Current</span>
            ) : null}
            {selectedParentId === null ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
          </button>

          {visibleRootIds.length === 0 && filterActive ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No folders match.</p>
          ) : null}

          {visibleRootIds.map((id, index) => (
            <FolderPickerNode
              key={id}
              id={id}
              depth={1}
              sourceId={sourceId}
              selectedParentId={selectedParentId}
              onSelect={onSelect}
              openFolders={openFolders}
              onToggle={toggleFolder}
              matchSet={matchSet}
              posInSet={index + 1}
              setSize={visibleRootIds.length}
            />
          ))}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Moving to <span className="font-medium text-foreground">{formatPathLabel(selectedParentId)}</span>
        {selectedParentId === (source?.parentId ?? null) ? " (current location)" : ""}.
      </p>
    </div>
  );
}

type FolderPickerNodeProps = {
  id: NodeId;
  depth: number;
  sourceId: NodeId;
  selectedParentId: NodeId | null;
  onSelect: (parentId: NodeId | null) => void;
  openFolders: Record<NodeId, boolean>;
  onToggle: (id: NodeId) => void;
  matchSet: Set<NodeId> | null;
  posInSet: number;
  setSize: number;
};

function FolderPickerNode({
  id,
  depth,
  sourceId,
  selectedParentId,
  onSelect,
  openFolders,
  onToggle,
  matchSet,
  posInSet,
  setSize,
}: FolderPickerNodeProps) {
  const node = useTreeStore((state) => state.nodes[id]);
  const nodes = useTreeStore((state) => state.nodes);
  const rootIds = useTreeStore((state) => state.rootIds);

  if (!node || node.type !== "folder") {
    return null;
  }
  if (matchSet && !matchSet.has(id)) {
    return null;
  }

  const reason = destinationReason(sourceId, node.id, nodes);
  const selectable = isSelectableReason(reason);
  const childIds = listFolderChildIds(nodes, node.id, rootIds);
  const visibleChildIds = matchSet
    ? childIds.filter((childId) => matchSet.has(childId))
    : childIds;
  const forceOpen = Boolean(matchSet?.has(id) && visibleChildIds.length > 0);
  const isOpen = forceOpen || Boolean(openFolders[node.id]);
  const isSelected = selectedParentId === node.id;
  const hasChildren = visibleChildIds.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex min-w-0 items-center rounded-md",
          isSelected ? "bg-sidebar-accent text-foreground" : "hover:bg-muted/40",
          !selectable && !isSelected && "opacity-60",
        )}
        style={{ paddingLeft: depth * INDENT_SIZE }}
      >
        <button
          type="button"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
          tabIndex={hasChildren ? 0 : -1}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (hasChildren) {
              onToggle(node.id);
            }
          }}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              isOpen ? "rotate-90" : "",
              !hasChildren && "opacity-0",
            )}
          />
        </button>
        <button
          type="button"
          role="treeitem"
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-selected={isSelected}
          aria-disabled={!selectable}
          aria-level={depth + 1}
          aria-posinset={posInSet}
          aria-setsize={setSize}
          disabled={!selectable}
          title={reason ? describeMoveBlockReason(reason) : node.path}
          onClick={() => {
            if (selectable) {
              onSelect(node.id);
            }
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-1 pr-2 text-left text-sm",
            selectable ? "text-foreground" : "cursor-not-allowed text-muted-foreground",
          )}
        >
          {isOpen ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate">{node.name || "(untitled)"}</span>
          {reason === "current" ? (
            <span className="text-[11px] text-muted-foreground">Current</span>
          ) : null}
          {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
        </button>
      </div>
      {isOpen && hasChildren ? (
        <div role="group">
          {visibleChildIds.map((childId, index) => (
            <FolderPickerNode
              key={childId}
              id={childId}
              depth={depth + 1}
              sourceId={sourceId}
              selectedParentId={selectedParentId}
              onSelect={onSelect}
              openFolders={openFolders}
              onToggle={onToggle}
              matchSet={matchSet}
              posInSet={index + 1}
              setSize={visibleChildIds.length}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
