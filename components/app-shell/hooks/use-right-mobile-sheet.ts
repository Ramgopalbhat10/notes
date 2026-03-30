import { useCallback, useState } from "react";

import type { RightSidebarPanel } from "@/stores/layout";

type UseRightMobileSheetOptions = {
  hasRight: boolean;
  rightSidebarPanel: RightSidebarPanel;
  setRightSidebarPanel: (panel: RightSidebarPanel) => void;
  openRightSidebar: (panel: RightSidebarPanel) => void;
  toggleRightSidebar: (panel?: RightSidebarPanel) => void;
};

type UseRightMobileSheetResult = {
  rightMobileOpen: boolean;
  rightMobileExpanded: boolean;
  setRightMobileOpen: (open: boolean) => void;
  handleRightMobileOpenChange: (open: boolean) => void;
  toggleRightMobileExpansion: () => void;
  toggleRight: () => void;
  openRightPanel: (panel: RightSidebarPanel) => void;
  openChatSidebar: () => void;
  openOutlineSidebar: () => void;
  openAssistantSidebar: () => void;
  handleOutlineNavigateOnMobile: () => void;
};

export function useRightMobileSheet({
  hasRight,
  rightSidebarPanel,
  setRightSidebarPanel,
  openRightSidebar,
  toggleRightSidebar,
}: UseRightMobileSheetOptions): UseRightMobileSheetResult {
  const [rightMobileOpen, setRightMobileOpen] = useState(false);
  const [rightMobileExpanded, setRightMobileExpanded] = useState(false);

  const handleRightMobileOpenChange = useCallback((open: boolean) => {
    setRightMobileOpen(open);
    if (!open) {
      setRightMobileExpanded(false);
    }
  }, []);

  const toggleRightMobileExpansion = useCallback(() => {
    setRightMobileExpanded((value) => !value);
  }, []);

  const toggleRight = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      toggleRightSidebar("chat");
      return;
    }

    if (rightMobileOpen) {
      if (rightSidebarPanel !== "chat") {
        setRightSidebarPanel("chat");
      } else {
        setRightMobileOpen(false);
      }
      return;
    }

    setRightSidebarPanel("chat");
    setRightMobileOpen(true);
  }, [rightMobileOpen, rightSidebarPanel, setRightSidebarPanel, toggleRightSidebar]);

  const openRightPanel = useCallback((panel: RightSidebarPanel) => {
    if (!hasRight) {
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      openRightSidebar(panel);
      return;
    }

    setRightSidebarPanel(panel);
    setRightMobileOpen(true);
  }, [hasRight, openRightSidebar, setRightSidebarPanel]);

  const openChatSidebar = useCallback(() => {
    openRightPanel("chat");
  }, [openRightPanel]);

  const openOutlineSidebar = useCallback(() => {
    openRightPanel("outline");
  }, [openRightPanel]);

  const openAssistantSidebar = useCallback(() => {
    openRightPanel("assistant");
  }, [openRightPanel]);

  const handleOutlineNavigateOnMobile = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }

    setRightMobileOpen(false);
    setRightMobileExpanded(false);
  }, []);

  return {
    rightMobileOpen,
    rightMobileExpanded,
    setRightMobileOpen,
    handleRightMobileOpenChange,
    toggleRightMobileExpansion,
    toggleRight,
    openRightPanel,
    openChatSidebar,
    openOutlineSidebar,
    openAssistantSidebar,
    handleOutlineNavigateOnMobile,
  };
}
