"use client";

import { useEffect, useState } from "react";

import { DEFAULT_CHAT_MODEL, FALLBACK_LANGUAGE_MODELS, parseModelId, type GatewayLanguageModelOption } from "@/lib/ai/models";
import { extractResponseError } from "@/lib/http/client";
import { useChatStore } from "@/stores/chat";

const MODELS_CACHE_STORAGE_KEY = "sidebar-chat-models-cache-v1";
const MODELS_CACHE_TTL_MS = 12 * 60 * 60 * 1_000;

type GatewayModelsResponse = {
  defaultModel?: string;
  source?: "gateway" | "fallback";
  models?: GatewayLanguageModelOption[];
};

type CachedModelsState = {
  availableModels: GatewayLanguageModelOption[];
  gatewayDefaultModel: string;
  cachedAt: number;
};

let sharedModelsState: CachedModelsState | null = null;
let sharedModelsPromise: Promise<CachedModelsState> | null = null;

function isModelsCacheFresh(value: CachedModelsState): boolean {
  return Date.now() - value.cachedAt <= MODELS_CACHE_TTL_MS;
}

function normalizeAvailableModels(models: GatewayModelsResponse["models"]): GatewayLanguageModelOption[] {
  if (!Array.isArray(models)) {
    return [];
  }

  const deduped = new Map<string, GatewayLanguageModelOption>();
  for (const model of models) {
    if (!model || model.type !== "language" || !parseModelId(model.id)) {
      continue;
    }
    if (!deduped.has(model.id)) {
      deduped.set(model.id, model);
    }
  }

  return [...deduped.values()].sort((left, right) => {
    const byProvider = left.provider.localeCompare(right.provider, undefined, { sensitivity: "base" });
    if (byProvider !== 0) {
      return byProvider;
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true });
  });
}

function buildCachedModelsState(payload: GatewayModelsResponse): CachedModelsState {
  const models = normalizeAvailableModels(payload.models);
  const normalizedDefault = parseModelId(payload.defaultModel) || DEFAULT_CHAT_MODEL;
  return {
    availableModels: models.length > 0 ? models : FALLBACK_LANGUAGE_MODELS,
    gatewayDefaultModel: normalizedDefault,
    cachedAt: Date.now(),
  };
}

function readModelsStateFromStorage(): CachedModelsState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(MODELS_CACHE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      availableModels?: GatewayLanguageModelOption[];
      gatewayDefaultModel?: string;
      cachedAt?: number;
    };
    if (!parsed || typeof parsed.cachedAt !== "number") {
      return null;
    }

    const normalizedModels = normalizeAvailableModels(parsed.availableModels);
    const gatewayDefaultModel = parseModelId(parsed.gatewayDefaultModel) || DEFAULT_CHAT_MODEL;
    return {
      availableModels: normalizedModels.length > 0 ? normalizedModels : FALLBACK_LANGUAGE_MODELS,
      gatewayDefaultModel,
      cachedAt: parsed.cachedAt,
    };
  } catch {
    return null;
  }
}

function writeModelsStateToStorage(value: CachedModelsState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MODELS_CACHE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors (quota/private mode).
  }
}

async function loadModelsState(): Promise<CachedModelsState> {
  if (sharedModelsState && isModelsCacheFresh(sharedModelsState)) {
    return sharedModelsState;
  }

  const stored = readModelsStateFromStorage();
  if (stored && isModelsCacheFresh(stored)) {
    sharedModelsState = stored;
    return stored;
  }

  if (sharedModelsPromise) {
    return sharedModelsPromise;
  }

  sharedModelsPromise = (async () => {
    const response = await fetch("/api/ai/models");
    if (!response.ok) {
      throw new Error(await extractResponseError(response, `Failed to load models (${response.status})`));
    }
    const payload = (await response.json()) as GatewayModelsResponse;
    const nextState = buildCachedModelsState(payload);
    sharedModelsState = nextState;
    writeModelsStateToStorage(nextState);
    return nextState;
  })();

  try {
    return await sharedModelsPromise;
  } finally {
    sharedModelsPromise = null;
  }
}

function resolveDefaultModel(models: GatewayLanguageModelOption[], preferredModel: string): string {
  if (models.some((model) => model.id === preferredModel)) {
    return preferredModel;
  }
  if (models.some((model) => model.id === DEFAULT_CHAT_MODEL)) {
    return DEFAULT_CHAT_MODEL;
  }
  if (models.length > 0) {
    return models[0].id;
  }
  return DEFAULT_CHAT_MODEL;
}

export function useModels() {
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);

  const [availableModels, setAvailableModels] = useState<GatewayLanguageModelOption[]>(
    sharedModelsState?.availableModels ?? FALLBACK_LANGUAGE_MODELS,
  );
  const [gatewayDefaultModel, setGatewayDefaultModel] = useState(
    sharedModelsState?.gatewayDefaultModel ?? DEFAULT_CHAT_MODEL,
  );
  const [modelsLoading, setModelsLoading] = useState(() => sharedModelsState === null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const state = await loadModelsState();
        if (!active) {
          return;
        }

        setAvailableModels(state.availableModels);
        setGatewayDefaultModel(state.gatewayDefaultModel);
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("Failed to fetch AI Gateway models", error);
        setAvailableModels(FALLBACK_LANGUAGE_MODELS);
        setGatewayDefaultModel(DEFAULT_CHAT_MODEL);
      } finally {
        if (active) {
          setModelsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  // Validate selected model against available models
  useEffect(() => {
    if (modelsLoading) {
      return;
    }

    if (availableModels.some((model) => model.id === selectedModel)) {
      return;
    }

    const fallback = resolveDefaultModel(availableModels, gatewayDefaultModel);
    if (fallback !== selectedModel) {
      setSelectedModel(fallback);
    }
  }, [modelsLoading, availableModels, gatewayDefaultModel, selectedModel, setSelectedModel]);

  return {
    availableModels,
    modelsLoading,
    selectedModel,
    setSelectedModel,
  };
}
