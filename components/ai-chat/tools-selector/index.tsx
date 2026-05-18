"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToolItem } from "./tool-item";
import type { ToolsSelectorProps } from "./types";

export function ToolsSelector({
  tools,
  enabledTools,
  onToggleProvider,
  portalContainer,
}: ToolsSelectorProps) {
  const [open, setOpen] = useState(false);

  const hasEnabledTools = Object.values(enabledTools).some(
    (providers) => providers.length > 0,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full",
            hasEnabledTools
              ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Tools"
        >
          <Wrench className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        avoidCollisions
        collisionPadding={8}
        className="w-72 rounded-xl p-0 shadow-lg"
        container={portalContainer ?? undefined}
      >
        <div className="border-b border-border/60 px-3 py-2">
          <div className="text-xs font-medium">Tools</div>
        </div>
        <div className="max-h-[300px] overflow-auto py-1">
          {tools.map((tool) => (
            <ToolItem
              key={tool.id}
              tool={tool}
              enabledTools={enabledTools}
              onToggleProvider={onToggleProvider}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
