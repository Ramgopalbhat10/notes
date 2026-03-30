import { cloneElement, isValidElement, useMemo, type ReactElement, type ReactNode } from "react";

import type { RightSidebarPanel } from "@/stores/layout";

type UseRightSidebarPanelOptions = {
  right: ReactNode;
  rightSidebarPanel: RightSidebarPanel;
  onOutlineNavigateOnMobile: () => void;
};

type UseRightSidebarPanelResult = {
  rightSidebarTitle: string;
  showNewChatAction: boolean;
  renderedRight: ReactNode;
};

export function useRightSidebarPanel({
  right,
  rightSidebarPanel,
  onOutlineNavigateOnMobile,
}: UseRightSidebarPanelOptions): UseRightSidebarPanelResult {
  const rightSidebarTitle = rightSidebarPanel === "outline"
    ? "Outline"
    : rightSidebarPanel === "assistant"
      ? "Assistant"
      : "Chat";
  const showNewChatAction = rightSidebarPanel === "chat";

  const renderedRight = useMemo(() => {
    if (rightSidebarPanel !== "outline" || !isValidElement(right)) {
      return right;
    }

    return cloneElement(
      right as ReactElement<{ onNavigateToSection?: () => void }>,
      { onNavigateToSection: onOutlineNavigateOnMobile },
    );
  }, [onOutlineNavigateOnMobile, right, rightSidebarPanel]);

  return {
    rightSidebarTitle,
    showNewChatAction,
    renderedRight,
  };
}
