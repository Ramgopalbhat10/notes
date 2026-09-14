"use client";

import type { DragEvent, MouseEvent } from "react";
import {
  evaluateMoveDestination,
  resolveDropParentId,
} from "@/lib/tree/move-destination";
import { type Node, useTreeStore } from "@/stores/tree";
import { useTreeDrag } from "../drag-context";

export function useNodeDragProps(node: Node) {
  const drag = useTreeDrag();
  const nodes = useTreeStore((state) => state.nodes);
  const destination = resolveDropParentId(node);
  const isDragging = drag.draggedId === node.id;
  const isFolderTarget = node.type === "folder" && drag.draggedId !== null && drag.dropParentId === node.id;
  const dropResult = isFolderTarget && drag.draggedId
    ? evaluateMoveDestination(drag.draggedId, node.id, nodes)
    : null;

  const onDragStart = (event: DragEvent) => {
    event.stopPropagation();
    drag.beginDrag(event, node.id);
  };

  const onDragEnd = () => {
    drag.endDrag();
  };

  const onDragOver = (event: DragEvent) => {
    if (!drag.draggedId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const result = evaluateMoveDestination(drag.draggedId, destination, nodes);
    event.dataTransfer.dropEffect = result.ok ? "move" : "none";
    drag.hoverDestination(destination);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    drag.dropOn(destination);
  };

  const onClickCapture = (event: MouseEvent) => {
    if (drag.shouldSuppressClick()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return {
    isDragging,
    isDropTarget: isFolderTarget,
    dropAllowed: dropResult?.ok === true,
    shouldSuppressClick: drag.shouldSuppressClick,
    dragProps: {
      draggable: true,
      "aria-grabbed": isDragging,
      onDragStart,
      onDragEnd,
      onDragOver,
      onDrop,
      onClickCapture,
    },
  };
}
