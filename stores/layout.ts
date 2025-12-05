import { create } from "zustand";

type WorkspaceLayoutState = {
  centered: boolean;
  toggleCentered: () => void;
  setCentered: (value: boolean) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
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
}));
