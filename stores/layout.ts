import { create } from "zustand";

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
  setRightSidebarOpen: (open: boolean) => void;
  setRightSidebarExpanded: (expanded: boolean) => void;
  toggleRightSidebar: () => void;
  toggleRightSidebarExpansion: () => void;
  closeRightSidebar: () => void;
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
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open, ...(open ? {} : { rightSidebarExpanded: false }) }),
  setRightSidebarExpanded: (expanded) => set({ rightSidebarExpanded: expanded }),
  toggleRightSidebar: () =>
    set((state) => ({
      rightSidebarOpen: !state.rightSidebarOpen,
      rightSidebarExpanded: state.rightSidebarOpen ? false : state.rightSidebarExpanded,
    })),
  toggleRightSidebarExpansion: () =>
    set((state) => ({
      rightSidebarExpanded: !state.rightSidebarExpanded,
    })),
  closeRightSidebar: () => set({ rightSidebarOpen: false, rightSidebarExpanded: false }),
}));
