"use client";

import { Check } from "lucide-react";

import type { GatewayLanguageModelOption } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { ProviderAvatar } from "./provider-avatar";
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
        <div className="px-2 py-2 text-xs text-muted-foreground">Loading models...</div>
      ) : null}
      {!modelsLoading && filteredModelGroups.length === 0 ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">
          No models match your filters.
        </div>
      ) : null}
      {!modelsLoading && noModels ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">No models available</div>
      ) : null}
      {filteredModelGroups.map((group) => (
        <div key={group.provider} className="pb-1">
          <ProviderGroupHeader provider={group.provider} />
          <div className="space-y-0.5">
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
        </div>
      ))}
    </div>
  );
}

type ProviderGroupHeaderProps = {
  provider: string;
};

// Sticky uppercase muted header so the current provider stays visible while
// scanning a long list. The backdrop blur avoids row text bleeding through
// when the list scrolls under it.
function ProviderGroupHeader({ provider }: ProviderGroupHeaderProps) {
  return (
    <div className="sticky top-0 z-10 -mx-1 bg-popover/95 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-popover/80">
      {toProviderLabel(provider)}
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
      aria-pressed={isSelected}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 pl-2.5 text-left text-xs transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent/60",
      )}
    >
      {/* Selected row accent stripe. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-colors",
          isSelected ? "bg-primary" : "bg-transparent",
        )}
      />
      <ProviderAvatar provider={model.provider} size="sm" />
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          isSelected ? "font-medium" : "font-normal",
        )}
      >
        {model.name}
      </span>
      {features.length > 0 ? (
        <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
          {features.map((feature) => (
            <span key={`${model.id}-${feature.tag}`} className="inline-flex" title={feature.label}>
              <feature.Icon className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">{feature.label}</span>
            </span>
          ))}
        </span>
      ) : null}
      {isSelected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
      ) : null}
    </button>
  );
}
