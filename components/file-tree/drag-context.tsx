"use client";

import { createContext, useContext } from "react";
import type { DragEvent } from "react";
import type { NodeId } from "@/stores/tree";

export type TreeDragContextValue = {
  draggedId: NodeId | null;
  dropParentId: NodeId | null | undefined;
  beginDrag: (event: DragEvent, nodeId: NodeId) => void;
  hoverDestination: (destinationParentId: NodeId | null) => void;
  clearHover: () => void;
  dropOn: (destinationParentId: NodeId | null) => void;
  endDrag: () => void;
  shouldSuppressClick: () => boolean;
};

const noopDragContext: TreeDragContextValue = {
  draggedId: null,
  dropParentId: undefined,
  beginDrag: () => undefined,
  hoverDestination: () => undefined,
  clearHover: () => undefined,
  dropOn: () => undefined,
  endDrag: () => undefined,
  shouldSuppressClick: () => false,
};

export const TreeDragContext = createContext<TreeDragContextValue>(noopDragContext);

export function useTreeDrag(): TreeDragContextValue {
  return useContext(TreeDragContext);
}
