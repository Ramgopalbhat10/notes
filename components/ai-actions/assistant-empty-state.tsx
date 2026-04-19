"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AI_ACTIONS } from "@/components/vault-workspace/constants";
import type { AiActionType } from "@/components/vault-workspace/types";

type AssistantEmptyStateProps = {
  currentFileName: string;
  disabled: boolean;
  onQuickAction: (action: AiActionType) => void;
};

// Empty state for the assistant sidebar. Mirrors the empty-state chrome of the
// chat sidebar: soft accent glyph, short heading, muted helper, and a row of
// quick-action chips so users always have a single click into the feature.
export function AssistantEmptyState({
  currentFileName,
  disabled,
  onQuickAction,
}: AssistantEmptyStateProps) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">Rewrite with AI</h3>
        <p className="max-w-[28ch] text-xs leading-5 text-muted-foreground">
          Improve, summarize, or expand
          {" "}
          <span className="font-medium text-foreground">{currentFileName}</span>
          {" "}
          — or highlight text in edit or preview to act on a passage.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {AI_ACTIONS.map((action) => (
          <Button
            key={action.value}
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1.5 rounded-full border-border/70 px-3 text-xs font-medium",
              "hover:border-border hover:bg-accent/60",
            )}
            disabled={disabled}
            onClick={() => onQuickAction(action.value)}
          >
            <action.icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
