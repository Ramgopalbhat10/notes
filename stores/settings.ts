"use client";

import { create } from "zustand";
import { type UserSettings, defaultUserSettings } from "@/components/settings/types";

type SettingsState = {
  settings: UserSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  initialized: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: (newSettings: UserSettings) => Promise<void>;
  resetToDefaults: () => Promise<void>;
};

async function saveToServer(settings: UserSettings): Promise<UserSettings> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error("Failed to save settings");
  }
  return response.json();
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: defaultUserSettings,
  loading: false,
  saving: false,
  error: null,
  initialized: false,

  fetchSettings: async () => {
    if (get().initialized) return;
    
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const settings = await response.json();
      set({ settings, loading: false, initialized: true });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      set({ loading: false, error: "Failed to load settings", initialized: true });
    }
  },

  saveSettings: async (newSettings) => {
    set({ saving: true, error: null });
    try {
      const saved = await saveToServer(newSettings);
      set({ settings: saved, saving: false });
    } catch (error) {
      console.error("Failed to save settings:", error);
      set({ saving: false, error: "Failed to save settings" });
      throw error;
    }
  },

  resetToDefaults: async () => {
    set({ saving: true, error: null });
    try {
      const saved = await saveToServer(defaultUserSettings);
      set({ settings: saved, saving: false });
    } catch (error) {
      console.error("Failed to reset settings:", error);
      set({ saving: false, error: "Failed to reset settings" });
      throw error;
    }
  },
}));

