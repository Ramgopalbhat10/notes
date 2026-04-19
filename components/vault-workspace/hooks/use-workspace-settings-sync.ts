import { useEffect } from "react";

type UseWorkspaceSettingsSyncOptions = {
  settingsInitialized: boolean;
  centeredLayout: boolean;
  setCentered: (value: boolean) => void;
};

/**
 * Bootstraps the workspace layout store from persisted user settings.
 *
 * Runs at most once per page load. Uses a module-scoped flag rather than a
 * `useRef`/component-scoped state so it survives `VaultWorkspace` remounts —
 * the `files/[[...path]]/layout.tsx` `Suspense` + `connection()` boundary
 * re-mounts the workspace tree on every file switch, which would otherwise
 * re-run the effect and clobber in-session layout state (e.g. the header
 * centered-layout toggle) with the stale server value.
 *
 * Header affordances mutate the layout store directly, and the settings
 * modal's save/reset paths call `setCentered` themselves after persisting,
 * so downstream propagation still works once bootstrapped.
 */
let bootstrapped = false;

export function useWorkspaceSettingsSync({
  settingsInitialized,
  centeredLayout,
  setCentered,
}: UseWorkspaceSettingsSyncOptions): void {
  useEffect(() => {
    if (!settingsInitialized || bootstrapped) {
      return;
    }
    bootstrapped = true;
    setCentered(centeredLayout);
  }, [settingsInitialized, centeredLayout, setCentered]);
}
