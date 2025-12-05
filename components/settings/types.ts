export type EditorSettings = {
  defaultMode: "preview" | "edit";
};

export type AppearanceSettings = {
  centeredLayout: boolean;
};

export type PrivacySettings = {
  rememberLastOpenedFile: boolean;
};

export type UserSettings = {
  editor: EditorSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
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
};

export type SettingsSection = "editor" | "appearance" | "privacy" | "about";

