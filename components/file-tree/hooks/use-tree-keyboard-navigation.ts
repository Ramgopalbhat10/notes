"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import type { Node, NodeId } from "@/stores/tree";
import type { MatchMeta } from "../types";

export function useTreeKeyboardNavigation(params: {
  containerRef: RefObject<HTMLDivElement | null>;
  activeId: NodeId | null;
  setActiveId: (id: NodeId | null) => void;
  nodes: Record<NodeId, Node>;
  openFolders: Record<NodeId, boolean>;
  filterActive: boolean;
  matchMap: Map<NodeId, MatchMeta> | null;
  toggleFolder: (id: NodeId) => Promise<void> | void;
  select: (id: NodeId) => void;
  filteredRootIds: NodeId[];
  selectedId: NodeId | null;
  onRename?: (id: NodeId) => void;
  onDelete?: (id: NodeId) => void;
  onCreateFile?: (parentId: NodeId | null) => void;
  onCreateFolder?: (parentId: NodeId | null) => void;
  onMove?: (id: NodeId) => void;
}) {
  const {
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
    onRename,
    onDelete,
    onCreateFile,
    onCreateFolder,
    onMove
  } = params;

  useEffect(() => {
    const items = containerRef.current?.querySelectorAll<HTMLButtonElement>("[data-node-id]");
    if (!items || items.length === 0) {
      setActiveId(null);
      return;
    }
    const itemArray = Array.from(items);
    const activeStillVisible = activeId ? itemArray.some((item) => item.dataset.nodeId === activeId) : false;
    if (!activeStillVisible) {
      if (selectedId) {
        const selectedElement = itemArray.find((item) => item.dataset.nodeId === selectedId);
        if (selectedElement) {
          setActiveId(selectedElement.dataset.nodeId ?? null);
          return;
        }
      }
      setActiveId(null);
    }
  }, [filteredRootIds, nodes, openFolders, filterActive, matchMap, activeId, containerRef, setActiveId, selectedId]);

  const focusNodeByIndex = (index: number) => {
    const items = containerRef.current?.querySelectorAll<HTMLButtonElement>("[data-node-id]");
    if (!items || items.length === 0) {
      return;
    }
    const clampedIndex = Math.min(Math.max(index, 0), items.length - 1);
    const element = items[clampedIndex];
    if (!element) {
      return;
    }
    const nextId = element.dataset.nodeId ?? null;
    setActiveId(nextId);
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = containerRef.current?.querySelectorAll<HTMLButtonElement>("[data-node-id]");
    if (!items || items.length === 0) {
      return;
    }
    const itemArray = Array.from(items);
    const currentIndex = activeId ? itemArray.findIndex((el) => el.dataset.nodeId === activeId) : -1;
    const activeNode = activeId ? nodes[activeId] : undefined;

    switch (event.key) {
      case "ArrowDown": {
        const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
        focusNodeByIndex(nextIndex);
        event.preventDefault();
        break;
      }
      case "ArrowUp": {
        const nextIndex = currentIndex === -1 ? itemArray.length - 1 : currentIndex - 1;
        focusNodeByIndex(nextIndex);
        event.preventDefault();
        break;
      }
      case "ArrowRight": {
        if (activeNode && activeNode.type === "folder") {
          const isOpen = filterActive ? true : openFolders[activeNode.id] ?? false;
          if (!isOpen && !filterActive) {
            void toggleFolder(activeNode.id);
          } else {
            const children = filterActive && matchMap
              ? activeNode.children.filter((childId: NodeId) => matchMap.get(childId)?.include)
              : activeNode.children;
            if (children.length > 0) {
              focusNodeByIndex(Math.min(currentIndex + 1, itemArray.length - 1));
            }
          }
        }
        event.preventDefault();
        break;
      }
      case "ArrowLeft": {
        if (!activeNode) {
          break;
        }
        if (activeNode.type === "folder" && !filterActive && (openFolders[activeNode.id] ?? false)) {
          void toggleFolder(activeNode.id);
        } else if (activeNode.parentId) {
          const parent = itemArray.find((el) => el.dataset.nodeId === activeNode.parentId);
          if (parent) {
            setActiveId(activeNode.parentId);
            parent.focus({ preventScroll: true });
            parent.scrollIntoView({ block: "nearest" });
          }
        }
        event.preventDefault();
        break;
      }
      case "Enter": {
        if (!activeNode) {
          break;
        }
        if (activeNode.type === "folder") {
          if (!filterActive) {
            void toggleFolder(activeNode.id);
          }
          setActiveId(activeNode.id);
        } else {
          select(activeNode.id);
        }
        event.preventDefault();
        break;
      }
      case "F2": {
        if (activeNode && onRename) {
          onRename(activeNode.id);
          event.preventDefault();
        }
        break;
      }
      case "Delete":
      case "Backspace": {
        // Cmd+Backspace on Mac is mostly standard for delete, generic Delete key otherwise
        if (activeNode && onDelete) {
          if (event.key === "Delete" || (event.key === "Backspace" && (event.metaKey || event.ctrlKey))) {
            onDelete(activeNode.id);
            event.preventDefault();
          }
        }
        break;
      }
      case "n": {
        if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
          // Cmd+N: New File
          event.preventDefault();
          event.stopPropagation();
          const parentId = activeNode ? (activeNode.type === "folder" ? activeNode.id : activeNode.parentId) : null;
          onCreateFile?.(parentId);
        } else if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
          // Cmd+Shift+N: New Folder
          event.preventDefault();
          event.stopPropagation();
          const parentId = activeNode ? (activeNode.type === "folder" ? activeNode.id : activeNode.parentId) : null;
          onCreateFolder?.(parentId);
        }
        break;
      }
      case "m": {
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && onMove && activeNode) {
          // Cmd+Shift+M: Move
          event.preventDefault();
          event.stopPropagation();
          onMove(activeNode.id);
        }
        break;
      }
      default:
        break;
    }
  };

  return { handleKeyDown };
}
