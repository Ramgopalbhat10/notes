import {
  DEFAULT_CHAT_MODEL,
  FALLBACK_LANGUAGE_MODELS,
  parseModelId,
  type GatewayLanguageModelOption,
} from "@/lib/ai/models";

const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";
const MODELS_REVALIDATE_SECONDS = 300;

type ModelsResponse = {
  defaultModel: string;
  source: "gateway" | "fallback";
  models: GatewayLanguageModelOption[];
};

type GatewayModelsPayload = {
  data?: unknown;
};

export async function GET() {
  const configuredDefault = resolveConfiguredDefaultModel();

  try {
    const headers: HeadersInit = { accept: "application/json" };
    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (gatewayKey) {
      headers["authorization"] = `Bearer ${gatewayKey}`;
    }

    const response = await fetch(GATEWAY_MODELS_URL, {
      headers,
      next: { revalidate: MODELS_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      throw new Error(`AI Gateway models request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GatewayModelsPayload;
    const languageModels = normalizeLanguageModels(payload);
    const models = ensureDefaultModel(languageModels, configuredDefault);
    const defaultModel = selectDefaultModel(configuredDefault, models);

    return json(
      {
        defaultModel,
        source: "gateway",
        models,
      } satisfies ModelsResponse,
      { headers: cacheHeaders() },
    );
  } catch (error) {
    console.error("/api/ai/models failed", error);
    const models = ensureDefaultModel(FALLBACK_LANGUAGE_MODELS, configuredDefault);
    const defaultModel = selectDefaultModel(configuredDefault, models);

    return json(
      {
        defaultModel,
        source: "fallback",
        models,
      } satisfies ModelsResponse,
      { headers: cacheHeaders() },
    );
  }
}

function resolveConfiguredDefaultModel(): string {
  return parseModelId(process.env.AI_CHAT_MODEL) || parseModelId(process.env.AI_MODEL) || DEFAULT_CHAT_MODEL;
}

function normalizeLanguageModels(payload: GatewayModelsPayload): GatewayLanguageModelOption[] {
  const rawModels = Array.isArray(payload.data) ? payload.data : [];

  const models = rawModels
    .map((model) => normalizeLanguageModel(model))
    .filter((model): model is GatewayLanguageModelOption => Boolean(model));

  return sortModels(dedupeModels(models));
}

function normalizeLanguageModel(value: unknown): GatewayLanguageModelOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const model = value as Record<string, unknown>;
  const type = safeString(model.type);
  if (type !== "language") {
    return null;
  }

  const id = parseModelId(safeString(model.id));
  if (!id) {
    return null;
  }

  const provider = id.split("/")[0] || "unknown";
  const name = safeString(model.name) || prettifyModelName(id);

  return {
    id,
    name,
    provider,
    type: "language",
    contextWindow: safeNumber(model.context_window),
    maxTokens: safeNumber(model.max_tokens),
    description: safeString(model.description) || null,
    tags: safeStringArray(model.tags).map((tag) => tag.toLowerCase()),
  };
}

function ensureDefaultModel(
  models: GatewayLanguageModelOption[],
  configuredDefault: string,
): GatewayLanguageModelOption[] {
  if (models.some((model) => model.id === configuredDefault)) {
    return models;
  }

  const provider = configuredDefault.split("/")[0] || "unknown";
  return sortModels([
    {
      id: configuredDefault,
      name: prettifyModelName(configuredDefault),
      provider,
      type: "language",
      contextWindow: null,
      maxTokens: null,
      description: null,
      tags: [],
    },
    ...models,
  ]);
}

function selectDefaultModel(configuredDefault: string, models: GatewayLanguageModelOption[]): string {
  if (models.some((model) => model.id === configuredDefault)) {
    return configuredDefault;
  }

  if (models.length > 0) {
    return models[0].id;
  }

  return DEFAULT_CHAT_MODEL;
}

function dedupeModels(models: GatewayLanguageModelOption[]): GatewayLanguageModelOption[] {
  const map = new Map<string, GatewayLanguageModelOption>();
  for (const model of models) {
    if (!map.has(model.id)) {
      map.set(model.id, model);
    }
  }
  return [...map.values()];
}

function sortModels(models: GatewayLanguageModelOption[]): GatewayLanguageModelOption[] {
  return [...models].sort((left, right) => {
    const byProvider = left.provider.localeCompare(right.provider, undefined, { sensitivity: "base" });
    if (byProvider !== 0) {
      return byProvider;
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true });
  });
}

function prettifyModelName(modelId: string): string {
  const [, ...parts] = modelId.split("/");
  const candidate = parts.join("/") || modelId;
  return candidate
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function cacheHeaders(): HeadersInit {
  return {
    "cache-control": `public, max-age=60, s-maxage=${MODELS_REVALIDATE_SECONDS}, stale-while-revalidate=120`,
  };
}

function json(data: ModelsResponse, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}
