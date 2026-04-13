import { useEffect } from "react";

import { useEditorStore } from "@/stores/editor";
import type { RightSidebarPanel } from "@/stores/layout";

type UseAppShellShortcutsOptions = {
  hasRight: boolean;
  quickSwitcherOpen: boolean;
  rightMobileOpen: boolean;
  rightSidebarPanel: RightSidebarPanel;
  setQuickSwitcherOpen: (open: boolean) => void;
  setRightSidebarPanel: (panel: RightSidebarPanel) => void;
  setRightMobileOpen: (open: boolean) => void;
  toggleRightSidebar: (panel?: RightSidebarPanel) => void;
};

export function useAppShellShortcuts({
  hasRight,
  quickSwitcherOpen,
  rightMobileOpen,
  rightSidebarPanel,
  setQuickSwitcherOpen,
  setRightSidebarPanel,
  setRightMobileOpen,
  toggleRightSidebar,
}: UseAppShellShortcutsOptions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setQuickSwitcherOpen(!quickSwitcherOpen);
        return;
      }

      if (e.key === "Escape") {
        if (quickSwitcherOpen) {
          setQuickSwitcherOpen(false);
          return;
        }
        setRightMobileOpen(false);
        return;
      }

      if (e.key === "j" && (e.metaKey || e.ctrlKey) && hasRight) {
        e.preventDefault();
        if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
          toggleRightSidebar("chat");
        } else {
          if (rightMobileOpen) {
            if (rightSidebarPanel !== "chat") {
              setRightSidebarPanel("chat");
            } else {
              setRightMobileOpen(false);
            }
          } else {
            setRightSidebarPanel("chat");
            setRightMobileOpen(true);
          }
        }
        return;
      }

      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const editorState = useEditorStore.getState();
        if (
          editorState.fileKey &&
          editorState.dirty &&
          editorState.status !== "saving" &&
          editorState.status !== "conflict"
        ) {
          void editorState.save("manual");
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    hasRight,
    quickSwitcherOpen,
    rightMobileOpen,
    rightSidebarPanel,
    setQuickSwitcherOpen,
    setRightSidebarPanel,
    setRightMobileOpen,
    toggleRightSidebar,
  ]);
}
