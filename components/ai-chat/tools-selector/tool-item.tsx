"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatToolDefinition, EnabledTools, SearchProvider } from "@/lib/ai/tools";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

type ToolItemProps = {
  tool: ChatToolDefinition;
  enabledTools: EnabledTools;
  onToggleProvider: (toolId: string, providerId: string, enabled: boolean) => void;
};

function isProviderEnabled(enabledTools: EnabledTools, toolId: string, providerId: string): boolean {
  return enabledTools[toolId]?.includes(providerId) ?? false;
}

export function ToolItem({ tool, enabledTools, onToggleProvider }: ToolItemProps) {
  const Icon = tool.icon;
  const hasEnabledProviders = (enabledTools[tool.id]?.length ?? 0) > 0;

  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          hasEnabledProviders
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{tool.name}</div>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`${tool.name} providers`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={4}
          className="w-56 p-0"
        >
          <div className="max-h-[200px] overflow-auto">
            {tool.providers.map((provider: SearchProvider) => {
              const enabled = isProviderEnabled(enabledTools, tool.id, provider.id);
              return (
                <div
                  key={provider.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{provider.name}</div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked: boolean) =>
                      onToggleProvider(tool.id, provider.id, checked)
                    }
                  />
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
