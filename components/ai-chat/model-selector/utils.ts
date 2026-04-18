import { BrainCircuit, Eye, FileText, ImageIcon, Wrench } from "lucide-react";

import type { GatewayLanguageModelOption } from "@/lib/ai/models";
import type { ModelFeatureIcon, ModelGroup } from "./types";

const PROVIDER_ACCENT_CLASSES = [
  "bg-[oklch(0.70_0.12_160_/_0.18)] text-[oklch(0.80_0.13_160)]",
  "bg-[oklch(0.70_0.14_250_/_0.18)] text-[oklch(0.80_0.15_250)]",
  "bg-[oklch(0.70_0.18_290_/_0.18)] text-[oklch(0.80_0.18_290)]",
  "bg-[oklch(0.75_0.14_70_/_0.20)] text-[oklch(0.85_0.16_70)]",
  "bg-[oklch(0.70_0.13_30_/_0.18)] text-[oklch(0.82_0.15_30)]",
  "bg-[oklch(0.70_0.13_340_/_0.18)] text-[oklch(0.82_0.15_340)]",
  "bg-[oklch(0.70_0.12_200_/_0.18)] text-[oklch(0.82_0.14_200)]",
  "bg-[oklch(0.70_0.14_110_/_0.18)] text-[oklch(0.82_0.15_110)]",
];

export const MODEL_FEATURE_ICONS: ModelFeatureIcon[] = [
  { tag: "vision", label: "Vision", Icon: Eye },
  { tag: "tool-use", label: "Tool use", Icon: Wrench },
  { tag: "reasoning", label: "Reasoning", Icon: BrainCircuit },
  { tag: "image-generation", label: "Image generation", Icon: ImageIcon },
  { tag: "file-input", label: "File input", Icon: FileText },
];

export function groupModelsByProvider(
  models: GatewayLanguageModelOption[],
): ModelGroup[] {
  const grouped = new Map<string, GatewayLanguageModelOption[]>();

  for (const model of models) {
    const provider = model.provider || "unknown";
    const group = grouped.get(provider) || [];
    group.push(model);
    grouped.set(provider, group);
  }

  return [...grouped.entries()].map(([provider, providerModels]) => ({
    provider,
    models: providerModels,
  }));
}

export function toProviderLabel(provider: string): string {
  if (!provider) {
    return "Unknown";
  }
  const normalized = provider.toLowerCase();
  if (normalized === "openai") {
    return "OpenAI";
  }
  if (normalized === "xai") {
    return "xAI";
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function getModelFeatureIcons(model: GatewayLanguageModelOption): ModelFeatureIcon[] {
  const featureTags = deriveModelFeatureTags(model);
  return MODEL_FEATURE_ICONS.filter((feature) => featureTags.has(feature.tag));
}

export function deriveModelFeatureTags(model: GatewayLanguageModelOption): Set<string> {
  const tags = new Set(
    (Array.isArray(model.tags) ? model.tags : [])
      .map((tag) => tag.toLowerCase().trim())
      .filter(Boolean),
  );

  const description = (model.description || "").toLowerCase();
  if (!description) {
    return tags;
  }

  if (description.includes("vision")) {
    tags.add("vision");
  }
  if (description.includes("reasoning")) {
    tags.add("reasoning");
  }
  if (description.includes("tool")) {
    tags.add("tool-use");
  }
  if (description.includes("image generation") || description.includes("image-generation")) {
    tags.add("image-generation");
  }
  if (description.includes("file input") || description.includes("file-input")) {
    tags.add("file-input");
  }

  return tags;
}

// 1-char uppercase initial for the provider avatar glyph.
// Falls back to "?" when the provider string is empty.
export function getProviderInitials(provider: string): string {
  const trimmed = (provider || "").trim();
  if (!trimmed) {
    return "?";
  }
  const firstChar = trimmed.replace(/[^a-z0-9]/gi, "").charAt(0);
  return (firstChar || trimmed.charAt(0)).toUpperCase();
}

// Deterministic tint class for a provider's avatar.
// Same provider always lands on the same palette slot so the sidebar keeps
// a stable provider identity across sessions, themes, and reorderings.
export function getProviderAccentClass(provider: string): string {
  const key = (provider || "").toLowerCase();
  if (!key) {
    return PROVIDER_ACCENT_CLASSES[0];
  }
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return PROVIDER_ACCENT_CLASSES[hash % PROVIDER_ACCENT_CLASSES.length];
}
