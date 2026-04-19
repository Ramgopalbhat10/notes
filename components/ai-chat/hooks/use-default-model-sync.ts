"use client";

import { useEffect, useRef } from "react";

import { useChatStore } from "@/stores/chat";
import { useSettingsStore } from "@/stores/settings";

/**
 * Seeds `useChatStore.selectedModel` from the persisted default in Settings
 * (`settings.ai.defaultModel`) on the first load of the chat surface.
 *
 * Behavior:
 *  - Fires once per page load: fetches settings if not already initialized,
 *    then applies the saved default when it differs from the in-memory model
 *    AND the user has not manually picked a model during this session.
 *  - A user pick in the chat sidebar flips `modelUserOverridden = true`, which
 *    prevents this sync from clobbering the session choice (including across
 *    New Chat). Only a full reload — which resets the in-memory store — clears
 *    the override and allows the Settings default to take effect again.
 */
export function useDefaultModelSync(): void {
  const initialized = useSettingsStore((state) => state.initialized);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const defaultModel = useSettingsStore((state) => state.settings.ai.defaultModel);

  const modelUserOverridden = useChatStore((state) => state.modelUserOverridden);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);

  const appliedRef = useRef(false);

  useEffect(() => {
    if (!initialized) {
      void fetchSettings();
    }
  }, [initialized, fetchSettings]);

  useEffect(() => {
    if (appliedRef.current) {
      return;
    }
    if (!initialized) {
      return;
    }
    appliedRef.current = true;

    if (modelUserOverridden) {
      return;
    }
    if (!defaultModel) {
      return;
    }
    if (defaultModel === selectedModel) {
      return;
    }

    setSelectedModel(defaultModel, { source: "system" });
  }, [initialized, modelUserOverridden, defaultModel, selectedModel, setSelectedModel]);
}
