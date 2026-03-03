import { useEffect } from "react";

type UseWorkspaceSettingsSyncOptions = {
  fetchSettings: () => Promise<void>;
  settingsInitialized: boolean;
  centeredLayout: boolean;
  setCentered: (value: boolean) => void;
};

export function useWorkspaceSettingsSync({
  fetchSettings,
  settingsInitialized,
  centeredLayout,
  setCentered,
}: UseWorkspaceSettingsSyncOptions): void {
  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settingsInitialized) {
      setCentered(centeredLayout);
    }
  }, [settingsInitialized, centeredLayout, setCentered]);
}
