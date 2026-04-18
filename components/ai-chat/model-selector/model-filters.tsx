"use client";

import { useCallback } from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProviderAvatar } from "./provider-avatar";
import type { ModelFeatureIcon } from "./types";
import { toProviderLabel } from "./utils";

type ModelFiltersProps = {
  providerOptions: string[];
  featureOptions: ModelFeatureIcon[];
  providerFilter: string;
  onProviderFilter: (provider: string) => void;
  featureFilter: string;
  onFeatureFilter: (feature: string) => void;
  providerFiltersScrollRef: React.RefObject<HTMLDivElement | null>;
};

const scrollbarDesktop =
  "[scrollbar-width:thin] [touch-action:auto] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-track]:bg-transparent";
const scrollbarMobile =
  "[scrollbar-width:none] [-ms-overflow-style:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden";

export function ModelFilters({
  providerOptions,
  featureOptions,
  providerFilter,
  onProviderFilter,
  featureFilter,
  onFeatureFilter,
  providerFiltersScrollRef,
}: ModelFiltersProps) {
  const isMobile = useIsMobile();

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (isMobile) {
        return;
      }
      const element = event.currentTarget;
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      if (maxScrollLeft <= 0) {
        return;
      }
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      const nextScrollLeft = Math.min(
        maxScrollLeft,
        Math.max(0, element.scrollLeft + event.deltaY),
      );
      if (nextScrollLeft !== element.scrollLeft) {
        if (event.cancelable) {
          event.preventDefault();
        }
        element.scrollLeft = nextScrollLeft;
      }
    },
    [isMobile],
  );

  const scrollbarClass = isMobile ? scrollbarMobile : scrollbarDesktop;

  return (
    <div className="mt-2 space-y-1.5">
      {providerOptions.length > 1 ? (
        <div
          ref={providerFiltersScrollRef}
          onWheel={handleWheel}
          className={cn("w-full overflow-x-auto overflow-y-hidden pb-1 pr-1", scrollbarClass)}
        >
          <div className="flex w-max min-w-full items-center gap-1">
            <ProviderAllChip
              active={providerFilter === "all"}
              onClick={() => onProviderFilter("all")}
            />
            {providerOptions.map((provider) => (
              <ProviderChip
                key={provider}
                provider={provider}
                active={providerFilter === provider}
                onClick={() => onProviderFilter(provider)}
              />
            ))}
          </div>
        </div>
      ) : null}
      {featureOptions.length > 0 ? (
        <div
          onWheel={handleWheel}
          className={cn("w-full overflow-x-auto overflow-y-hidden pb-1 pr-1", scrollbarClass)}
        >
          <div className="flex w-max min-w-full gap-1">
            <FeatureChip
              label="Any feature"
              active={featureFilter === "all"}
              onClick={() => onFeatureFilter("all")}
            />
            {featureOptions.map((feature) => (
              <FeatureChip
                key={feature.tag}
                label={feature.label}
                active={featureFilter === feature.tag}
                onClick={() => onFeatureFilter(feature.tag)}
                icon={<feature.Icon className="h-3 w-3" />}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ProviderAllChipProps = {
  active: boolean;
  onClick: () => void;
};

function ProviderAllChip({ active, onClick }: ProviderAllChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="All providers"
      aria-label="All providers"
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary/15 text-foreground ring-1 ring-inset ring-primary/40"
          : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      All
    </button>
  );
}

type ProviderChipProps = {
  provider: string;
  active: boolean;
  onClick: () => void;
};

function ProviderChip({ provider, active, onClick }: ProviderChipProps) {
  const label = toProviderLabel(provider);
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-primary/10 ring-1 ring-inset ring-primary/50"
          : "bg-muted/50 ring-1 ring-inset ring-transparent hover:bg-accent hover:ring-border/60",
      )}
    >
      <ProviderAvatar provider={provider} size="md" />
    </button>
  );
}

type FeatureChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
};

function FeatureChip({ label, active, onClick, icon }: FeatureChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-foreground ring-1 ring-inset ring-primary/40"
          : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
