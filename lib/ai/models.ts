export const DEFAULT_CHAT_MODEL = "google/gemini-3-flash";

export const MODEL_ID_PATTERN = /^[-a-zA-Z0-9_.:+/]+$/;

export type GatewayLanguageModelOption = {
  id: string;
  name: string;
  provider: string;
  type: "language";
  contextWindow: number | null;
  maxTokens: number | null;
};

export const FALLBACK_LANGUAGE_MODELS: GatewayLanguageModelOption[] = [
  {
    id: DEFAULT_CHAT_MODEL,
    name: "Gemini 3 Flash",
    provider: "google",
    type: "language",
    contextWindow: null,
    maxTokens: null,
  },
];

export function isValidModelId(value: string): boolean {
  return MODEL_ID_PATTERN.test(value);
}

export function parseModelId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }

  return isValidModelId(cleaned) ? cleaned : null;
}
