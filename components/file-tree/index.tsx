"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FolderPlus, RefreshCw, Search, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROOT_PARENT_KEY, type NodeId, useTreeStore } from "@/stores/tree";
import { normalizeFolderPrefix } from "@/lib/fs-validation";
import { encodePath } from "@/lib/utils";
import { ActionDialog } from "./action-dialog";
import { TreeNode } from "./tree-nodes";
import { type MatchMeta, type ModalState } from "./types";
import { useDebouncedValue as useDebouncedValueHook } from "./hooks/use-debounced-value";
import { useTreeKeyboardNavigation as useTreeKeyboardNavigationHook } from "./hooks/use-tree-keyboard-navigation";
import { useToast } from "@/hooks/use-toast";

export function FileTree() {
  const router = useRouter();
  const initRoot = useTreeStore((state) => state.initRoot);
  const refreshTree = useTreeStore((state) => state.refreshTree);
  const rootIds = useTreeStore((state) => state.rootIds);
  const rootLoading = useTreeStore((state) => state.loadingByParent[ROOT_PARENT_KEY] ?? false);
  const rootError = useTreeStore((state) => state.errorByParent[ROOT_PARENT_KEY] ?? null);
  const selectedId = useTreeStore((state) => state.selectedId);
  const nodes = useTreeStore((state) => state.nodes);
  const openFolders = useTreeStore((state) => state.openFolders);
  const toggleFolder = useTreeStore((state) => state.toggleFolder);
  const select = useTreeStore((state) => state.select);
  const refreshState = useTreeStore((state) => state.refreshState);
  const refreshError = useTreeStore((state) => state.refreshError);
  const refreshSuccessAt = useTreeStore((state) => state.refreshSuccessAt);
  const refreshLastSource = useTreeStore((state) => state.refreshLastSource);
  const expandAll = useTreeStore((state) => state.expandAll);
  const collapseAll = useTreeStore((state) => state.collapseAll);
  const createFolderAction = useTreeStore((state) => state.createFolder);
  const createFileAction = useTreeStore((state) => state.createFile);
  const renameNodeAction = useTreeStore((state) => state.renameNode);
  const deleteNodeAction = useTreeStore((state) => state.deleteNode);
  const moveNodeAction = useTreeStore((state) => state.moveNode);
  const idToSlug = useTreeStore((state) => state.idToSlug);
  const getPreviousInHistory = useTreeStore((state) => state.getPreviousInHistory);
  const removeFromHistory = useTreeStore((state) => state.removeFromHistory);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValueHook(query, 200);
  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const filterActive = normalizedQuery.length > 0;

  const [activeId, setActiveId] = useState<NodeId | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const refreshSuccessRef = useRef<string | null>(null);
  const refreshErrorRef = useRef<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const { toast } = useToast();

  const openModal = (state: ModalState) => {
    setModal(state);
  };

  useEffect(() => {
    void initRoot();
  }, [initRoot]);

  // Notify on root loading errors
  useEffect(() => {
    if (rootError) {
      toast({ title: "Failed to load files", description: rootError, variant: "destructive" });
    }
  }, [rootError, toast]);

  useEffect(() => {
    if (selectedId) {
      setActiveId(selectedId);
    } else {
      setActiveId(null);
    }
  }, [selectedId]);

  useEffect(() => {
    if (refreshLastSource !== "manual") {
      refreshSuccessRef.current = refreshSuccessAt ?? null;
      return;
    }
    if (refreshSuccessAt && refreshSuccessAt !== refreshSuccessRef.current) {
      toast({ title: "Tree refreshed", description: "Latest files are now available." });
      refreshSuccessRef.current = refreshSuccessAt;
    }
  }, [refreshLastSource, refreshSuccessAt, toast]);

  useEffect(() => {
    if (!refreshError) {
      refreshErrorRef.current = null;
      return;
    }
    if (refreshError === refreshErrorRef.current) {
      return;
    }
    if (refreshLastSource === "manual") {
      toast({ title: "Refresh failed", description: refreshError, variant: "destructive" });
    } else if (refreshLastSource === "mutation") {
      toast({ title: "Update failed", description: refreshError, variant: "destructive" });
    }
    refreshErrorRef.current = refreshError;
  }, [refreshLastSource, refreshError, toast]);

  useEffect(() => {
    if (!modal) {
      setModalInput("");
      setModalError(null);
      setModalSubmitting(false);
      return;
    }

    setModalError(null);
    setModalSubmitting(false);

    switch (modal.type) {
      case "create-folder":
      case "create-file":
        setModalInput("");
        break;
      case "rename":
        setModalInput(modal.initialName);
        break;
      case "move":
        setModalInput(modal.currentParentId ?? "");
        break;
      case "delete":
        setModalInput("");
        break;
    }
  }, [modal]);

  const handleCloseModal = () => {
    if (!modalSubmitting) {
      setModal(null);
    }
  };

  const formatPathLabel = (path: string | null | undefined) => {
    if (!path || path.length === 0) {
      return "root";
    }
    const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
    return trimmed.length > 0 ? trimmed : "root";
  };

  const handleModalSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!modal) {
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      switch (modal.type) {
        case "create-folder": {
          const name = modalInput.trim();
          if (!name) {
            setModalError("Folder name is required.");
            setModalSubmitting(false);
            return;
          }
          await createFolderAction(modal.parentId, name);
          toast({ title: "Folder created", description: `Created "${name}"` });
          break;
        }
        case "create-file": {
          const name = modalInput.trim();
          if (!name) {
            setModalError("File name is required.");
            setModalSubmitting(false);
            return;
          }
          await createFileAction(modal.parentId, name);
          toast({ title: "File created", description: `Created "${name}"` });
          break;
        }
        case "rename": {
          const name = modalInput.trim();
          if (!name) {
            setModalError("Name is required.");
            setModalSubmitting(false);
            return;
          }
          await renameNodeAction(modal.nodeId, name);
          toast({ title: "Renamed", description: `Renamed to "${name}"` });
          break;
        }
        case "move": {
          const value = modalInput.trim();
          let destination: NodeId | null = null;
          if (value) {
            try {
              const candidate = value.endsWith("/") ? value : `${value}/`;
              destination = normalizeFolderPrefix(candidate);
            } catch (error) {
              setModalError(error instanceof Error ? error.message : "Invalid destination path.");
              setModalSubmitting(false);
              return;
            }
          }
          await moveNodeAction(modal.nodeId, destination);
          const destLabel = formatPathLabel(destination);
          toast({ title: "Moved", description: `Moved to ${destLabel}` });
          break;
        }
        case "delete": {
          const wasSelected = selectedId === modal.nodeId;
          const previousId = wasSelected ? getPreviousInHistory() : null;

          await deleteNodeAction(modal.nodeId);
          removeFromHistory(modal.nodeId);

          // If deleted file was currently selected, navigate to previous
          if (wasSelected) {
            if (previousId) {
              const slug = idToSlug[previousId] ?? previousId;
              router.push(`/files/${encodePath(slug)}`, { scroll: false });
            } else {
              router.push("/files", { scroll: false });
            }
          }

          toast({ title: "Deleted", description: `Deleted "${modal.name}"` });
          break;
        }
      }

      setModal(null);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast({ title: "Action failed", description: message, variant: "destructive" });
    } finally {
      setModalSubmitting(false);
    }
  };

  const matchMap = useMemo(() => {
    if (!filterActive) {
      return null;
    }
    const map = new Map<NodeId, MatchMeta>();
    const visit = (id: NodeId): boolean => {
      const node = nodes[id];
      if (!node) {
        return false;
      }
      const matchesSelf = node.name.toLowerCase().includes(normalizedQuery);
      let hasMatchingChild = false;
      if (node.type === "folder") {
        hasMatchingChild = node.children.some((childId) => visit(childId));
      }
      const include = matchesSelf || hasMatchingChild;
      map.set(id, { include, matchesSelf, hasMatchingChild });
      return include;
    };
    rootIds.forEach((id) => visit(id));
    return map;
  }, [filterActive, nodes, normalizedQuery, rootIds]);

  const filteredRootIds = useMemo(() => {
    if (!filterActive || !matchMap) {
      return rootIds;
    }
    return rootIds.filter((id) => matchMap.get(id)?.include);
  }, [filterActive, matchMap, rootIds]);

  const { handleKeyDown } = useTreeKeyboardNavigationHook({
    containerRef,
    activeId,
    setActiveId,
    nodes,
    openFolders,
    filterActive,
    matchMap,
    toggleFolder,
    select,
    filteredRootIds,
    selectedId,
  });

  const renderEmptyState = () => {
    if (filterActive) {
      return (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-2 py-3 text-xs text-muted-foreground">
          No matches found.
        </div>
      );
    }
    return <div className="text-sm text-muted-foreground">No files yet</div>;
  };

  return (
    <>
      <div className="space-y-3">
        <div className="relative mb-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="h-9 rounded-md border border-transparent bg-muted/20 pl-4 pr-10 text-sm shadow-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-muted/30"
            aria-label="Search files"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="mb-2 flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40"
            aria-label="Refresh tree"
            title="Refresh file tree"
            onClick={() => void refreshTree()}
            disabled={refreshState !== "idle"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshState !== "idle" ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40"
            aria-label={allExpanded ? "Collapse all folders" : "Expand all folders"}
            title={allExpanded ? "Collapse all folders" : "Expand all folders"}
            onClick={() => {
              if (allExpanded) {
                collapseAll();
              } else {
                expandAll();
              }
              setAllExpanded(!allExpanded);
            }}
          >
            {allExpanded ? (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40"
            aria-label="New folder"
            onClick={() => openModal({ type: "create-folder", parentId: null })}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40"
            aria-label="New file"
            onClick={() => openModal({ type: "create-file", parentId: null })}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div
          ref={containerRef}
          className="space-y-1"
          role="tree"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="File tree"
        >
          {rootError ? (
            <div className="flex flex-col gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
              <span>Failed to load files: {rootError}</span>
              <Button size="sm" variant="outline" className="w-fit" onClick={() => void refreshTree()}>
                Retry
              </Button>
            </div>
          ) : null}

          {!rootError && rootLoading && rootIds.length === 0 ? (
            <div className="space-y-1" style={{ marginLeft: 12 }}>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : null}

          {!rootError && !rootLoading && filteredRootIds.length === 0 ? (
            renderEmptyState()
          ) : null}

          {!rootError && filteredRootIds.length > 0 ? (
            <div className="space-y-1">
              {filteredRootIds.map((id, idx) => (
                <TreeNode
                  key={id}
                  id={id}
                  depth={0}
                  selectedId={selectedId}
                  filterActive={filterActive}
                  matchMap={matchMap}
                  activeId={activeId}
                  onActiveChange={(id) => setActiveId(id)}
                  openModal={openModal}
                  posInSet={idx + 1}
                  setSize={filteredRootIds.length}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <ActionDialog
        modal={modal}
        input={modalInput}
        error={modalError}
        submitting={modalSubmitting}
        onInputChange={setModalInput}
        onSubmit={handleModalSubmit}
        onClose={handleCloseModal}
        formatPathLabel={formatPathLabel}
      />
    </>
  );
}
