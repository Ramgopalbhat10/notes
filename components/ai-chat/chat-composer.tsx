"use client";

import { useCallback, useEffect, useRef } from "react";
import { File, Paperclip, SendHorizontal, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { ModelSelector } from "./model-selector";

type ChatComposerProps = {
  contextFile: string | null;
  onRemoveContext: () => void;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled: boolean;
  portalContainer: HTMLElement | null;
};

export function ChatComposer({
  contextFile,
  onRemoveContext,
  draft,
  onDraftChange,
  onSubmit,
  onStop,
  isStreaming,
  disabled,
  portalContainer,
}: ChatComposerProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const contextFileName = contextFile
    ? contextFile.split("/").pop() || contextFile
    : null;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void onSubmit();
      }
    },
    [onSubmit],
  );

  const ensureComposerVisible = useCallback(() => {
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ block: "end" });
    });
  }, []);

  // Mobile: keep composer visible when virtual keyboard opens
  useEffect(() => {
    if (!isMobile || typeof window === "undefined" || !window.visualViewport) {
      return;
    }
    const viewport = window.visualViewport;
    const handleViewportChange = () => {
      if (document.activeElement !== inputRef.current) {
        return;
      }
      ensureComposerVisible();
    };
    viewport.addEventListener("resize", handleViewportChange);
    viewport.addEventListener("scroll", handleViewportChange);
    return () => {
      viewport.removeEventListener("resize", handleViewportChange);
      viewport.removeEventListener("scroll", handleViewportChange);
    };
  }, [ensureComposerVisible, isMobile]);

  return (
    <div ref={containerRef} className="shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="rounded-xl border border-border/60 bg-muted/40">
        {/* Context file chip */}
        {contextFile ? (
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border border-border/40 text-xs text-muted-foreground">
              <File className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{contextFileName}</span>
              <button
                type="button"
                onClick={onRemoveContext}
                className="ml-0.5 rounded-sm hover:bg-accent/60 p-0.5 transition-colors"
                aria-label="Remove context file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Textarea */}
        <div className="px-3 py-1.5">
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (isMobile) {
                ensureComposerVisible();
              }
            }}
            placeholder="Ask anything..."
            disabled={disabled}
            className="min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent p-0 text-sm shadow-none ring-0 outline-none placeholder:text-muted-foreground/60 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />
        </div>

        {/* Bottom: attach, model selector, send/stop */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Attach file (coming soon)</TooltipContent>
            </Tooltip>

            <ModelSelector portalContainer={portalContainer} />
          </div>

          <Button
            type="button"
            size="icon"
            variant={draft.trim() ? "default" : "ghost"}
            className={cn(
              "h-8 w-8 rounded-lg transition-colors",
              draft.trim() ? "" : "text-muted-foreground"
            )}
            onClick={isStreaming ? () => void onStop() : () => void onSubmit()}
            disabled={isStreaming ? false : disabled || !draft.trim()}
          >
            {isStreaming ? (
              <Square className="h-4 w-4" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
            <span className="sr-only">{isStreaming ? "Stop" : "Send"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
