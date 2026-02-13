import { create } from "zustand";

export type RightSidebarPanel = "chat" | "outline";

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
  setRightSidebarOpen: (open: boolean) => void;
  setRightSidebarExpanded: (expanded: boolean) => void;
  setRightSidebarPanel: (panel: RightSidebarPanel) => void;
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
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open, ...(open ? {} : { rightSidebarExpanded: false }) }),
  setRightSidebarExpanded: (expanded) => set({ rightSidebarExpanded: expanded }),
  setRightSidebarPanel: (panel) => set({ rightSidebarPanel: panel }),
  openRightSidebar: (panel) => set({ rightSidebarOpen: true, rightSidebarPanel: panel }),
  toggleRightSidebar: (panel) =>
    set((state) => ({
      ...(state.rightSidebarOpen
        ? panel && panel !== state.rightSidebarPanel
          ? { rightSidebarOpen: true, rightSidebarPanel: panel }
          : { rightSidebarOpen: false, rightSidebarExpanded: false }
        : {
          rightSidebarOpen: true,
          rightSidebarPanel: panel ?? state.rightSidebarPanel,
        }),
    })),
  toggleRightSidebarExpansion: () =>
    set((state) => ({
      rightSidebarExpanded: !state.rightSidebarExpanded,
    })),
  closeRightSidebar: () => set({ rightSidebarOpen: false, rightSidebarExpanded: false }),
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
