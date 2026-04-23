"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

import type { GatewayLanguageModelOption } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModels } from "../hooks/use-models";
import { ModelFilters } from "./model-filters";
import { ModelList } from "./model-list";
import { ProviderAvatar } from "./provider-avatar";
import { deriveModelFeatureTags, groupModelsByProvider, toProviderLabel, MODEL_FEATURE_ICONS } from "./utils";

/**
 * Controlled mode: `value` and `onChange` must be supplied together. When both
 * are present the selector reads/writes the caller's value instead of
 * `useChatStore` — used by the Settings modal to edit a draft without
 * mutating the active chat session. Omitting both reverts to the
 * `useChatStore`-backed default used by the chat/assistant sidebars.
 */
type ModelSelectorControlledProps = {
  value: string;
  onChange: (modelId: string) => void;
};

type ModelSelectorUncontrolledProps = {
  value?: undefined;
  onChange?: undefined;
};

type ModelSelectorProps = {
  portalContainer: HTMLElement | null;
  triggerVariant?: "default" | "icon";
} & (ModelSelectorControlledProps | ModelSelectorUncontrolledProps);

export function ModelSelector({
  portalContainer,
  triggerVariant = "default",
  value,
  onChange,
}: ModelSelectorProps) {
  const isMobile = useIsMobile();
  const {
    availableModels,
    modelsLoading,
    selectedModel: storeSelectedModel,
    setSelectedModel: storeSetSelectedModel,
  } = useModels();

  const isControlled = value !== undefined;
  const selectedModel = isControlled ? value : storeSelectedModel;
  const setSelectedModel = useCallback(
    (id: string) => {
      if (isControlled) {
        onChange(id);
        return;
      }
      storeSetSelectedModel(id, { source: "user" });
    },
    [isControlled, onChange, storeSetSelectedModel],
  );

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const providerFiltersScrollRef = useRef<HTMLDivElement>(null);

  const modelGroups = useMemo(() => groupModelsByProvider(availableModels), [availableModels]);
  const providerOptions = useMemo(
    () => modelGroups.map((group) => group.provider),
    [modelGroups],
  );
  const featureOptions = useMemo(() => {
    const availableTags = new Set<string>();
    for (const model of availableModels) {
      for (const tag of deriveModelFeatureTags(model)) {
        availableTags.add(tag);
      }
    }
    return MODEL_FEATURE_ICONS.filter((feature) => availableTags.has(feature.tag));
  }, [availableModels]);

  const hasActiveFilters = providerFilter !== "all" || featureFilter !== "all";

  const filteredModelGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesQuery = (model: GatewayLanguageModelOption) => {
      if (!normalizedQuery) {
        return true;
      }
      const providerLabel = toProviderLabel(model.provider).toLowerCase();
      return (
        model.name.toLowerCase().includes(normalizedQuery) ||
        model.id.toLowerCase().includes(normalizedQuery) ||
        providerLabel.includes(normalizedQuery)
      );
    };

    return modelGroups
      .map((group) => ({
        provider: group.provider,
        models: group.models.filter((model) => {
          const providerMatch = providerFilter === "all" || group.provider === providerFilter;
          const featureTags = deriveModelFeatureTags(model);
          const featureMatch = featureFilter === "all" || featureTags.has(featureFilter);
          return providerMatch && featureMatch && matchesQuery(model);
        }),
      }))
      .filter((group) => group.models.length > 0);
  }, [modelGroups, searchQuery, providerFilter, featureFilter]);

  const selectedModelOption = useMemo(
    () => availableModels.find((model) => model.id === selectedModel),
    [availableModels, selectedModel],
  );
  const selectedModelName = selectedModelOption?.name ?? selectedModel;
  const selectedProvider = selectedModelOption?.provider ?? "";
  const triggerTitle = selectedProvider
    ? `${toProviderLabel(selectedProvider)} - ${selectedModelName}`
    : selectedModelName;

  // Reset filters when provider/feature options change
  useEffect(() => {
    if (providerFilter !== "all" && !providerOptions.includes(providerFilter)) {
      setProviderFilter("all");
    }
  }, [providerFilter, providerOptions]);

  useEffect(() => {
    if (featureFilter !== "all" && !featureOptions.some((f) => f.tag === featureFilter)) {
      setFeatureFilter("all");
    }
  }, [featureFilter, featureOptions]);

  // Reset state when popover closes, focus search on open
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setProviderFilter("all");
      setFeatureFilter("all");
      setShowFilters(false);
      return;
    }
    const usesCoarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (isMobile || usesCoarsePointer) {
      return;
    }
    const frameId = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frameId);
  }, [isMobile, open]);

  const handleToggleFilters = useCallback(() => {
    setShowFilters((v) => !v);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "rounded-full bg-muted/50 text-xs font-medium text-foreground hover:bg-accent hover:text-foreground",
            triggerVariant === "icon"
              ? "h-7 w-7 px-0"
              : "h-7 gap-1.5 px-2 pr-2",
          )}
          title={triggerTitle}
          aria-label={`Select model: ${triggerTitle}`}
        >
          {selectedProvider ? (
            <ProviderAvatar provider={selectedProvider} size="sm" />
          ) : null}
          {triggerVariant === "default" ? (
            <>
              <span className="max-w-[140px] truncate">{selectedModelName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={isMobile ? "center" : "start"}
        side="top"
        sideOffset={8}
        avoidCollisions
        collisionPadding={8}
        className="w-[min(24rem,calc(100vw-2rem))] max-h-[min(70dvh,460px)] overflow-hidden rounded-xl p-0 shadow-lg"
        container={portalContainer ?? undefined}
      >
        <div className="border-b border-border/60 bg-popover px-2 pb-1.5 pt-1.5">
          <div className="flex items-center gap-1">
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 w-full rounded-sm bg-transparent pl-7 pr-7 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/60"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear model search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {providerOptions.length > 1 || featureOptions.length > 0 ? (
              <button
                type="button"
                onClick={handleToggleFilters}
                aria-pressed={showFilters || hasActiveFilters}
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                  hasActiveFilters
                    ? "bg-primary/10 text-foreground hover:bg-primary/15"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                aria-label="Toggle model filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {(providerOptions.length > 1 || featureOptions.length > 0) && showFilters ? (
            <ModelFilters
              providerOptions={providerOptions}
              featureOptions={featureOptions}
              providerFilter={providerFilter}
              onProviderFilter={setProviderFilter}
              featureFilter={featureFilter}
              onFeatureFilter={setFeatureFilter}
              providerFiltersScrollRef={providerFiltersScrollRef}
            />
          ) : null}
        </div>
        <ModelList
          filteredModelGroups={filteredModelGroups}
          modelsLoading={modelsLoading}
          noModels={modelGroups.length === 0}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
