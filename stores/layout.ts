import { create } from "zustand";

type WorkspaceLayoutState = {
  centered: boolean;
  toggleCentered: () => void;
  setCentered: (value: boolean) => void;
};

export const useWorkspaceLayoutStore = create<WorkspaceLayoutState>((set) => ({
  centered: false,
  toggleCentered: () =>
    set((state) => ({
      centered: !state.centered,
    })),
  setCentered: (value) => set({ centered: value }),
}));
