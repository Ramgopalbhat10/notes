"use client";

import { useEffect } from "react";

import { useChatStore } from "@/stores/chat";
import { useSettingsStore } from "@/stores/settings";

/**
 * Keeps `useChatStore.selectedModel` in sync with the persisted default in
 * Settings (`settings.ai.defaultModel`) for the chat surface.
 *
 * Behavior:
 *  - Fetches settings on first mount if they are not already initialized.
 *  - When `!modelUserOverridden`, propagates changes to the Settings default
 *    into the in-memory chat store so that saving a new default in Settings
 *    takes effect immediately (no reload required).
 *  - A user pick in the chat sidebar flips `modelUserOverridden = true`,
 *    which latches the session choice across New Chat. Only a full reload —
 *    which resets the in-memory store — clears the override and lets the
 *    Settings default take effect again.
 */
export function useDefaultModelSync(): void {
  const initialized = useSettingsStore((state) => state.initialized);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const defaultModel = useSettingsStore((state) => state.settings.ai.defaultModel);

  const modelUserOverridden = useChatStore((state) => state.modelUserOverridden);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);

  useEffect(() => {
    if (!initialized) {
      void fetchSettings();
    }
  }, [initialized, fetchSettings]);

  useEffect(() => {
    if (!initialized) return;
    if (modelUserOverridden) return;
    if (!defaultModel) return;
    if (defaultModel === selectedModel) return;

    setSelectedModel(defaultModel, { source: "system" });
  }, [initialized, modelUserOverridden, defaultModel, selectedModel, setSelectedModel]);
}
