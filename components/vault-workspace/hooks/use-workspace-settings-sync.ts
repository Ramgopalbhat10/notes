import { useEffect } from "react";

type UseWorkspaceSettingsSyncOptions = {
  settingsInitialized: boolean;
  centeredLayout: boolean;
  setCentered: (value: boolean) => void;
};

export function useWorkspaceSettingsSync({
  settingsInitialized,
  centeredLayout,
  setCentered,
}: UseWorkspaceSettingsSyncOptions): void {
  useEffect(() => {
    if (settingsInitialized) {
      setCentered(centeredLayout);
    }
  }, [settingsInitialized, centeredLayout, setCentered]);
}
