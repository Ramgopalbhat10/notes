"use client";

import { create } from "zustand";
import { type UserSettings, defaultUserSettings } from "@/components/settings/types";
import { extractResponseError } from "@/lib/http/client";

const LOCAL_SETTINGS_STORAGE_KEY = "mrgb-user-settings";

type SettingsState = {
  settings: UserSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  initialized: boolean;
  fetchedFromServer: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: (newSettings: UserSettings) => Promise<void>;
  resetToDefaults: () => Promise<void>;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeSettings(candidate: unknown): UserSettings {
  const value = (candidate ?? {}) as Partial<UserSettings>;
  return {
    editor: { ...defaultUserSettings.editor, ...(value.editor ?? {}) },
    appearance: { ...defaultUserSettings.appearance, ...(value.appearance ?? {}) },
    privacy: { ...defaultUserSettings.privacy, ...(value.privacy ?? {}) },
  };
}

function loadLocalSettings(): UserSettings | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeSettings(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to load local settings snapshot:", error);
    return null;
  }
}

function persistLocalSettings(settings: UserSettings): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to persist local settings snapshot:", error);
  }
}

async function saveToServer(settings: UserSettings): Promise<UserSettings> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error(await extractResponseError(response, "Failed to save settings"));
  }
  return (await response.json()) as UserSettings;
}

const initialLocalSettings = loadLocalSettings();

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: initialLocalSettings ?? defaultUserSettings,
  loading: false,
  saving: false,
  error: null,
  initialized: initialLocalSettings !== null,
  fetchedFromServer: false,

  fetchSettings: async () => {
    if (get().loading || get().fetchedFromServer) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error(await extractResponseError(response, "Failed to fetch settings"));
      }
      const settings = normalizeSettings((await response.json()) as UserSettings);
      persistLocalSettings(settings);
      set({ settings, loading: false, initialized: true, fetchedFromServer: true });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      set({ loading: false, error: "Failed to load settings", initialized: true });
    }
  },

  saveSettings: async (newSettings) => {
    set({ saving: true, error: null });
    try {
      const saved = normalizeSettings(await saveToServer(newSettings));
      persistLocalSettings(saved);
      set({ settings: saved, saving: false, initialized: true });
    } catch (error) {
      console.error("Failed to save settings:", error);
      set({ saving: false, error: "Failed to save settings" });
      throw error;
    }
  },

  resetToDefaults: async () => {
    set({ saving: true, error: null });
    try {
      const saved = normalizeSettings(await saveToServer(defaultUserSettings));
      persistLocalSettings(saved);
      set({ settings: saved, saving: false, initialized: true });
    } catch (error) {
      console.error("Failed to reset settings:", error);
      set({ saving: false, error: "Failed to reset settings" });
      throw error;
    }
  },
}));
