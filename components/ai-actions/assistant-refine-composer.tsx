"use client";

import { ArrowUp, Loader2 } from "lucide-react";

import { ModelSelector } from "@/components/ai-chat/model-selector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AssistantRefineComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  canSubmit: boolean;
  portalContainer: HTMLElement | null;
};

// Compact single-row refine composer. The input owns the available width while
// model selection and send/stop stay as small controls on the trailing edge.
export function AssistantRefineComposer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  isStreaming,
  canSubmit,
  portalContainer,
}: AssistantRefineComposerProps) {
  return (
    <div className="flex min-h-11 items-center gap-1.5 border-t border-border/50 px-3 pb-[calc(0.25rem+env(safe-area-inset-bottom))] pt-1">
      <Textarea
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Refine this draft, change tone, make it shorter, or ask for more detail..."
        rows={1}
        disabled={isStreaming}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            (event.metaKey || event.ctrlKey) &&
            !event.shiftKey &&
            !isStreaming &&
            canSubmit
          ) {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="h-7 min-h-7 flex-1 resize-none overflow-hidden border-0 bg-transparent px-0 py-1 text-xs leading-5 shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <ModelSelector portalContainer={portalContainer} triggerVariant="icon" />
      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-full bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={onStop}
          aria-label="Stop refining"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={!canSubmit}
          onClick={onSubmit}
          aria-label="Refine draft"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
