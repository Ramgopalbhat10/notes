import { useCallback, useMemo } from "react";

import type { Node, NodeId } from "@/lib/tree/types";

type UseSiblingNavigationOptions = {
  selectedId: NodeId | null;
  nodes: Record<NodeId, Node>;
  select: (id: NodeId) => void;
};

type UseSiblingNavigationResult = {
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  handleNavigatePrev: () => void;
  handleNavigateNext: () => void;
};

export function useSiblingNavigation({
  selectedId,
  nodes,
  select,
}: UseSiblingNavigationOptions): UseSiblingNavigationResult {
  const siblingNavigation = useMemo(() => {
    if (!selectedId) {
      return { prevId: null, nextId: null };
    }

    const selectedNode = nodes[selectedId];
    if (!selectedNode || selectedNode.type !== "file") {
      return { prevId: null, nextId: null };
    }

    const parentId = selectedNode.parentId;
    if (!parentId) {
      return { prevId: null, nextId: null };
    }

    const parentNode = nodes[parentId];
    if (!parentNode || parentNode.type !== "folder") {
      return { prevId: null, nextId: null };
    }

    const fileSiblingIds = parentNode.children.filter((childId) => nodes[childId]?.type === "file");
    if (fileSiblingIds.length <= 1) {
      return { prevId: null, nextId: null };
    }

    const currentIndex = fileSiblingIds.indexOf(selectedNode.id);
    if (currentIndex === -1) {
      return { prevId: null, nextId: null };
    }

    return {
      prevId: currentIndex > 0 ? fileSiblingIds[currentIndex - 1] : null,
      nextId: currentIndex < fileSiblingIds.length - 1 ? fileSiblingIds[currentIndex + 1] : null,
    };
  }, [nodes, selectedId]);

  const handleNavigatePrev = useCallback(() => {
    if (!siblingNavigation.prevId) {
      return;
    }
    select(siblingNavigation.prevId);
  }, [select, siblingNavigation.prevId]);

  const handleNavigateNext = useCallback(() => {
    if (!siblingNavigation.nextId) {
      return;
    }
    select(siblingNavigation.nextId);
  }, [select, siblingNavigation.nextId]);

  return {
    canNavigatePrev: siblingNavigation.prevId !== null,
    canNavigateNext: siblingNavigation.nextId !== null,
    handleNavigatePrev,
    handleNavigateNext,
  };
}
