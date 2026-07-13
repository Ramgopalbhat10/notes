import { create } from "zustand";

export type RightSidebarPanel = "chat" | "outline" | "assistant" | "versions";

type WorkspaceLayoutState = {
  centered: boolean;
  toggleCentered: () => void;
  setCentered: (value: boolean) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  // Right sidebar state
  rightSidebarOpen: boolean;
  rightSidebarExpanded: boolean;
  rightSidebarPanel: RightSidebarPanel;
  rightSidebarWidthPx: number | null;
  setRightSidebarOpen: (open: boolean) => void;
  setRightSidebarExpanded: (expanded: boolean) => void;
  setRightSidebarPanel: (panel: RightSidebarPanel) => void;
  setRightSidebarWidthPx: (width: number | null) => void;
  openRightSidebar: (panel: RightSidebarPanel) => void;
  toggleRightSidebar: (panel?: RightSidebarPanel) => void;
  toggleRightSidebarExpansion: () => void;
  closeRightSidebar: () => void;
  // Left sidebar state
  leftSidebarOpen: boolean;
  leftSidebarExpanded: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  toggleLeftSidebar: () => void;
  toggleLeftSidebarExpansion: () => void;
};

export const useWorkspaceLayoutStore = create<WorkspaceLayoutState>((set) => ({
  centered: false,
  toggleCentered: () =>
    set((state) => ({
      centered: !state.centered,
    })),
  setCentered: (value) => set({ centered: value }),
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  // Right sidebar state
  rightSidebarOpen: false,
  rightSidebarExpanded: false,
  rightSidebarPanel: "chat",
  rightSidebarWidthPx: null,
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open, ...(open ? {} : { rightSidebarExpanded: false, rightSidebarWidthPx: null }) }),
  setRightSidebarExpanded: (expanded) => set({ rightSidebarExpanded: expanded }),
  setRightSidebarPanel: (panel) => set({ rightSidebarPanel: panel }),
  setRightSidebarWidthPx: (width) => set({ rightSidebarWidthPx: width }),
  openRightSidebar: (panel) => set({ rightSidebarOpen: true, rightSidebarPanel: panel }),
  toggleRightSidebar: (panel) =>
    set((state) => ({
      ...(state.rightSidebarOpen
        ? panel && panel !== state.rightSidebarPanel
          ? { rightSidebarOpen: true, rightSidebarPanel: panel }
          : { rightSidebarOpen: false, rightSidebarExpanded: false, rightSidebarWidthPx: null }
        : {
          rightSidebarOpen: true,
          rightSidebarPanel: panel ?? state.rightSidebarPanel,
        }),
    })),
  toggleRightSidebarExpansion: () =>
    set((state) => ({
      rightSidebarExpanded: !state.rightSidebarExpanded,
    })),
  closeRightSidebar: () => set({ rightSidebarOpen: false, rightSidebarExpanded: false, rightSidebarWidthPx: null }),
  // Left sidebar state
  leftSidebarOpen: true,
  leftSidebarExpanded: false,
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open, ...(open ? {} : { leftSidebarExpanded: false }) }),
  toggleLeftSidebar: () =>
    set((state) => ({
      leftSidebarOpen: !state.leftSidebarOpen,
      leftSidebarExpanded: state.leftSidebarOpen ? false : state.leftSidebarExpanded,
    })),
  toggleLeftSidebarExpansion: () =>
    set((state) => ({
      leftSidebarExpanded: !state.leftSidebarExpanded,
    })),
}));
