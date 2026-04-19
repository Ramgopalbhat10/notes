"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "@/components/ai-chat/model-selector";
import { cn } from "@/lib/utils";

type AssistantRefineComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  canSubmit: boolean;
  portalContainer: HTMLElement | null;
};

// Refine composer modelled on the chat sidebar composer so the two surfaces
// feel consistent. The model selector lives in the footer (always visible) and
// the primary send/stop button sits on the trailing side with a matching icon
// treatment. Supports Cmd/Ctrl+Enter to submit for keyboard users.
export function AssistantRefineComposer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  isStreaming,
  canSubmit,
  portalContainer,
}: AssistantRefineComposerProps) {
  // Detect macOS on mount to render the correct modifier glyph. Defaults to
  // mac so first paint matches the convention used elsewhere in the app; we
  // flip to "Ctrl" post-hydration on Windows/Linux.
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform ?? navigator.platform ?? "";
    setIsMac(/mac|iphone|ipad|ipod/i.test(platform));
  }, []);

  return (
    <div className="border-t border-border/50 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div
        className={cn(
          "group overflow-hidden rounded-xl border border-border/70 bg-muted/30 shadow-sm transition-colors",
          "focus-within:border-border focus-within:bg-background focus-within:shadow",
        )}
      >
        <Textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="Refine this draft, change tone, make it shorter, or ask for more detail…"
          rows={3}
          disabled={isStreaming}
          onKeyDown={(event) => {
            if (
              (event.key === "Enter") &&
              (event.metaKey || event.ctrlKey) &&
              !event.shiftKey &&
              !isStreaming &&
              canSubmit
            ) {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="min-h-[72px] resize-none border-0 bg-transparent px-3 pt-2.5 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
          <ModelSelector portalContainer={portalContainer} />
          {isStreaming ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={onStop}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="h-8 w-8 rounded-md"
              disabled={!canSubmit}
              onClick={onSubmit}
              aria-label="Refine draft"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
        <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">
          {isMac ? "⌘" : "Ctrl"}
        </kbd>
        <span className="mx-0.5">+</span>
        <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">Enter</kbd>
        {" "}to refine
      </p>
    </div>
  );
}
