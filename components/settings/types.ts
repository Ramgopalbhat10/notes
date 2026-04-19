import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";

export type EditorSettings = {
  defaultMode: "preview" | "edit";
};

export type AppearanceSettings = {
  centeredLayout: boolean;
};

export type PrivacySettings = {
  rememberLastOpenedFile: boolean;
};

export type AiSettings = {
  defaultModel: string;
};

export type UserSettings = {
  editor: EditorSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  ai: AiSettings;
};

export const defaultUserSettings: UserSettings = {
  editor: {
    defaultMode: "preview",
  },
  appearance: {
    centeredLayout: false,
  },
  privacy: {
    rememberLastOpenedFile: true,
  },
  ai: {
    defaultModel: DEFAULT_CHAT_MODEL,
  },
};

export type SettingsSection = "editor" | "appearance" | "chat" | "privacy" | "about";
