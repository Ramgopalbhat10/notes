"use client";

import { useCallback } from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ModelFeatureIcon } from "./types";

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
    <div className="mt-1.5 space-y-1.5">
      {providerOptions.length > 1 ? (
        <div
          ref={providerFiltersScrollRef}
          onWheel={handleWheel}
          className={cn("w-full overflow-x-auto overflow-y-hidden pb-1 pr-1", scrollbarClass)}
        >
          <div className="flex w-max min-w-full gap-1">
            <FilterPill
              label="All providers"
              active={providerFilter === "all"}
              onClick={() => onProviderFilter("all")}
            />
            {providerOptions.map((provider) => (
              <FilterPill
                key={provider}
                label={provider}
                active={providerFilter === provider}
                onClick={() => onProviderFilter(provider)}
                truncate
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
            <FilterPill
              label="Any feature"
              active={featureFilter === "all"}
              onClick={() => onFeatureFilter("all")}
            />
            {featureOptions.map((feature) => (
              <FilterPill
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

type FilterPillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  truncate?: boolean;
  icon?: React.ReactNode;
};

function FilterPill({ label, active, onClick, truncate, icon }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
        truncate && "max-w-[140px]",
        active
          ? "border-primary/50 bg-primary/10 text-foreground"
          : "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      {truncate ? <span className="block truncate">{label}</span> : <span>{label}</span>}
    </button>
  );
}
