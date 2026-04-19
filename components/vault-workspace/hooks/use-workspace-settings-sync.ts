import { useEffect, useRef } from "react";

type UseWorkspaceSettingsSyncOptions = {
  settingsInitialized: boolean;
  centeredLayout: boolean;
  setCentered: (value: boolean) => void;
};

/**
 * Bootstraps the workspace layout store from persisted user settings.
 *
 * This runs once — the first time settings are initialized — and is never
 * re-asserted afterwards. Header affordances (e.g. the centered-layout
 * toggle) mutate the layout store directly, and settings-modal save/reset
 * paths call `setCentered` themselves after persisting. Re-syncing on every
 * settings change would clobber those in-session user actions.
 */
export function useWorkspaceSettingsSync({
  settingsInitialized,
  centeredLayout,
  setCentered,
}: UseWorkspaceSettingsSyncOptions): void {
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!settingsInitialized || bootstrappedRef.current) {
      return;
    }
    bootstrappedRef.current = true;
    setCentered(centeredLayout);
  }, [settingsInitialized, centeredLayout, setCentered]);
}
