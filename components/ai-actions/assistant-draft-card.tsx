"use client";

import { Check, Loader2, RefreshCcw } from "lucide-react";

import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type AssistantDraftCardProps = {
  // Panels
  originalTitle: string;
  originalText: string;
  result: string;
  // Modes
  showComparePanel: boolean;
  showRaw: boolean;
  onShowRawChange: (showRaw: boolean) => void;
  // State
  isStreaming: boolean;
  canApply: boolean;
  // CTAs
  replaceLabel: string;
  insertLabel: string;
  onReplace: () => void;
  onInsert: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
  regenerateDisabled: boolean;
};

// Consolidates the AI draft panel. When compare mode is on (≥ lg only), we
// render a matched pair of cards with identical chrome so the eye naturally
// compares them. Preview/Raw is a proper segmented toggle and the apply CTAs
// live in a single sticky footer instead of a flex-wrap row.
export function AssistantDraftCard({
  originalTitle,
  originalText,
  result,
  showComparePanel,
  showRaw,
  onShowRawChange,
  isStreaming,
  canApply,
  replaceLabel,
  insertLabel,
  onReplace,
  onInsert,
  onRegenerate,
  onCancel,
  regenerateDisabled,
}: AssistantDraftCardProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
      <div className={cn("grid min-h-0 flex-1 gap-3", showComparePanel && "grid-cols-2")}>
        {showComparePanel ? (
          <DraftPanel
            title={originalTitle}
            bodyClassName="bg-muted/20"
          >
            <ScrollBody>
              {showRaw ? (
                <RawText>{originalText}</RawText>
              ) : (
                <MarkdownPreview content={originalText} />
              )}
            </ScrollBody>
          </DraftPanel>
        ) : null}

        <DraftPanel
          title="AI draft"
          trailing={
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={showRaw ? "raw" : "preview"}
              onValueChange={(next) => {
                if (!next) return;
                onShowRawChange(next === "raw");
              }}
              className="h-6 rounded-md border-border/70 p-0.5"
            >
              <ToggleGroupItem
                value="preview"
                className="h-5 rounded-[4px] px-2 text-[10px] font-medium uppercase tracking-wide"
              >
                Preview
              </ToggleGroupItem>
              <ToggleGroupItem
                value="raw"
                className="h-5 rounded-[4px] px-2 text-[10px] font-medium uppercase tracking-wide"
              >
                Raw
              </ToggleGroupItem>
            </ToggleGroup>
          }
        >
          <ScrollBody>
            {result ? (
              showRaw ? (
                <RawText>{result}</RawText>
              ) : (
                <MarkdownPreview
                  content={result}
                  className="assistant-markdown text-xs leading-5"
                />
              )
            ) : isStreaming ? (
              <StreamingSkeleton />
            ) : (
              <div className="flex min-h-32 items-center justify-center text-xs text-muted-foreground">
                Run an action to generate a draft.
              </div>
            )}
          </ScrollBody>
        </DraftPanel>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={!canApply || isStreaming}
          onClick={onReplace}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          {replaceLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={!canApply || isStreaming}
          onClick={onInsert}
        >
          {insertLabel}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {isStreaming ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onCancel}
            >
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
              onClick={onRegenerate}
              disabled={regenerateDisabled}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Regenerate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type DraftPanelProps = {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
};

function DraftPanel({ title, trailing, children, bodyClassName }: DraftPanelProps) {
  return (
    <article
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm",
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </span>
        {trailing}
      </div>
      <div className={cn("min-h-0 flex-1 overflow-hidden", bodyClassName)}>{children}</div>
    </article>
  );
}

function ScrollBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full max-h-[32rem] overflow-y-auto px-3 py-3 text-xs leading-5">
      {children}
    </div>
  );
}

function RawText({ children }: { children: React.ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
      {children}
    </pre>
  );
}

// Streaming skeleton that mimics the shape of markdown content as it streams in,
// so users see progress instead of a centered spinner on a blank card.
function StreamingSkeleton() {
  return (
    <div className="space-y-2" aria-live="polite" aria-label="Generating AI draft">
      <Skeleton className="h-3 w-[92%]" />
      <Skeleton className="h-3 w-[78%]" />
      <Skeleton className="h-3 w-[85%]" />
      <Skeleton className="h-3 w-[62%]" />
      <div className="h-1.5" />
      <Skeleton className="h-3 w-[88%]" />
      <Skeleton className="h-3 w-[70%]" />
    </div>
  );
}
