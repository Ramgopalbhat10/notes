"use client";

import { Check } from "lucide-react";

import type { GatewayLanguageModelOption } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import type { ModelGroup } from "./types";
import { getModelFeatureIcons, toProviderLabel } from "./utils";

type ModelListProps = {
  filteredModelGroups: ModelGroup[];
  modelsLoading: boolean;
  noModels: boolean;
  selectedModel: string;
  onSelectModel: (id: string) => void;
  onClose: () => void;
};

export function ModelList({
  filteredModelGroups,
  modelsLoading,
  noModels,
  selectedModel,
  onSelectModel,
  onClose,
}: ModelListProps) {
  return (
    <div className="max-h-[min(62dvh,420px)] overflow-y-auto px-1 pb-1">
      {modelsLoading ? (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading models...</div>
      ) : null}
      {!modelsLoading && filteredModelGroups.length === 0 ? (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          No models match your filters.
        </div>
      ) : null}
      {!modelsLoading && noModels ? (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">No models available</div>
      ) : null}
      {filteredModelGroups.map((group, groupIndex) => (
        <div key={group.provider}>
          {groupIndex > 0 && <div className="my-1 h-px bg-border" />}
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {toProviderLabel(group.provider)}
          </div>
          {group.models.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              isSelected={model.id === selectedModel}
              onSelect={() => {
                onSelectModel(model.id);
                onClose();
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type ModelRowProps = {
  model: GatewayLanguageModelOption;
  isSelected: boolean;
  onSelect: () => void;
};

function ModelRow({ model, isSelected, onSelect }: ModelRowProps) {
  const features = getModelFeatureIcons(model);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent/80",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{model.name}</span>
      <span className="flex shrink-0 items-center gap-1">
        {features.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-1.5 py-0.5 text-muted-foreground">
            {features.map((feature) => (
              <span key={`${model.id}-${feature.tag}`} className="inline-flex" title={feature.label}>
                <feature.Icon className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">{feature.label}</span>
              </span>
            ))}
          </span>
        ) : null}
        {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}
