"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Node, NodeId } from "@/stores/tree";
import {
  describeMoveBlockReason,
  evaluateMoveDestination,
} from "@/lib/tree/move-destination";
import { getErrorMessage } from "@/lib/http/client";
import type { TreeDragContextValue } from "../drag-context";

const EXPAND_HOVER_MS = 650;

type ToastFn = (opts: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

type UseTreeDragDropParams = {
  nodes: Record<NodeId, Node>;
  openFolders: Record<NodeId, boolean>;
  toggleFolder: (id: NodeId) => void;
  moveNode: (id: NodeId, destinationParentId: NodeId | null) => Promise<void>;
  toast: ToastFn;
  formatPathLabel: (path: string | null | undefined) => string;
};

export function useTreeDragDrop({
  nodes,
  openFolders,
  toggleFolder,
  moveNode,
  toast,
  formatPathLabel,
}: UseTreeDragDropParams): TreeDragContextValue {
  const [draggedId, setDraggedId] = useState<NodeId | null>(null);
  const [dropParentId, setDropParentId] = useState<NodeId | null | undefined>(undefined);
  const suppressClickRef = useRef(false);
  const draggedIdRef = useRef<NodeId | null>(null);

  const endDrag = useCallback(() => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDropParentId(undefined);
    window.requestAnimationFrame(() => {
      suppressClickRef.current = false;
    });
  }, []);

  const beginDrag = useCallback((event: DragEvent, nodeId: NodeId) => {
    event.dataTransfer.setData("text/plain", nodeId);
    event.dataTransfer.effectAllowed = "move";
    draggedIdRef.current = nodeId;
    suppressClickRef.current = true;
    setDraggedId(nodeId);
    setDropParentId(undefined);
  }, []);

  const hoverDestination = useCallback((destinationParentId: NodeId | null) => {
    const sourceId = draggedIdRef.current;
    if (!sourceId) {
      return;
    }
    setDropParentId((current) => (current === destinationParentId ? current : destinationParentId));
  }, []);

  const clearHover = useCallback(() => {
    setDropParentId(undefined);
  }, []);

  const dropOn = useCallback((destinationParentId: NodeId | null) => {
    const sourceId = draggedIdRef.current;
    endDrag();
    if (!sourceId) {
      return;
    }

    const result = evaluateMoveDestination(sourceId, destinationParentId, nodes);
    if (!result.ok) {
      if (result.reason !== "current") {
        toast({
          title: "Can't move there",
          description: describeMoveBlockReason(result.reason),
          variant: "destructive",
        });
      }
      return;
    }

    void (async () => {
      try {
        await moveNode(sourceId, destinationParentId);
        toast({
          title: "Moved",
          description: `Moved to ${formatPathLabel(destinationParentId)}`,
        });
      } catch (error) {
        toast({
          title: "Move failed",
          description: getErrorMessage(error, "Something went wrong. Please try again."),
          variant: "destructive",
        });
      }
    })();
  }, [endDrag, formatPathLabel, moveNode, nodes, toast]);

  const shouldSuppressClick = useCallback(() => suppressClickRef.current, []);

  useEffect(() => {
    window.addEventListener("dragend", endDrag);
    return () => window.removeEventListener("dragend", endDrag);
  }, [endDrag]);

  useEffect(() => {
    if (!draggedId || dropParentId === undefined || dropParentId === null) {
      return;
    }
    if (openFolders[dropParentId]) {
      return;
    }
    const folder = nodes[dropParentId];
    if (!folder || folder.type !== "folder") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      toggleFolder(dropParentId);
    }, EXPAND_HOVER_MS);
    return () => window.clearTimeout(timeoutId);
  }, [draggedId, dropParentId, nodes, openFolders, toggleFolder]);

  return {
    draggedId,
    dropParentId,
    beginDrag,
    hoverDestination,
    clearHover,
    dropOn,
    endDrag,
    shouldSuppressClick,
  };
}
