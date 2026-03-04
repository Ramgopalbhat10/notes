import { BrainCircuit, Eye, FileText, ImageIcon, Wrench } from "lucide-react";

import type { GatewayLanguageModelOption } from "@/lib/ai/models";
import type { ModelFeatureIcon, ModelGroup } from "./types";

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
