"use client";

import { Check, CornerDownLeft, Loader2, RefreshCcw } from "lucide-react";

import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

// Compare mode keeps one draft card and stacks the original below the draft
// behind a horizontal resize handle, avoiding cramped columns at every width.
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2">
      <div className="flex min-h-0 flex-1">
        <DraftPanel
          title="AI draft"
          trailing={
            <DraftHeaderActions
              showRaw={showRaw}
              onShowRawChange={onShowRawChange}
              canApply={canApply}
              isStreaming={isStreaming}
              replaceLabel={replaceLabel}
              insertLabel={insertLabel}
              onReplace={onReplace}
              onInsert={onInsert}
              onRegenerate={onRegenerate}
              onCancel={onCancel}
              regenerateDisabled={regenerateDisabled}
            />
          }
        >
          {showComparePanel ? (
            <ResizablePanelGroup orientation="vertical" className="min-h-0">
              <ResizablePanel defaultSize={58} minSize={25}>
                <DraftContent
                  result={result}
                  showRaw={showRaw}
                  isStreaming={isStreaming}
                />
              </ResizablePanel>
              <ResizableHandle
                withHandle
                className="bg-border/80 transition-colors hover:bg-primary/60"
              />
              <ResizablePanel defaultSize={42} minSize={20}>
                <OriginalContent
                  title={originalTitle}
                  originalText={originalText}
                  showRaw={showRaw}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <DraftContent
              result={result}
              showRaw={showRaw}
              isStreaming={isStreaming}
            />
          )}
        </DraftPanel>
      </div>
    </div>
  );
}

type DraftContentProps = {
  result: string;
  showRaw: boolean;
  isStreaming: boolean;
};

function DraftContent({ result, showRaw, isStreaming }: DraftContentProps) {
  return (
    <ScrollBody>
      {result ? (
        showRaw ? (
          <RawText>{result}</RawText>
        ) : (
          <MarkdownPreview
            content={result}
            className="assistant-markdown text-xs leading-[1.4]"
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
  );
}

type OriginalContentProps = {
  title: string;
  originalText: string;
  showRaw: boolean;
};

function OriginalContent({ title, originalText, showRaw }: OriginalContentProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/15">
      <div className="border-b border-border/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </div>
      <ScrollBody>
        {showRaw ? (
          <RawText>{originalText}</RawText>
        ) : (
          <MarkdownPreview
            content={originalText}
            className="assistant-markdown text-xs leading-[1.4]"
          />
        )}
      </ScrollBody>
    </div>
  );
}

type DraftHeaderActionsProps = {
  showRaw: boolean;
  onShowRawChange: (showRaw: boolean) => void;
  canApply: boolean;
  isStreaming: boolean;
  replaceLabel: string;
  insertLabel: string;
  onReplace: () => void;
  onInsert: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
  regenerateDisabled: boolean;
};

function DraftHeaderActions({
  showRaw,
  onShowRawChange,
  canApply,
  isStreaming,
  replaceLabel,
  insertLabel,
  onReplace,
  onInsert,
  onRegenerate,
  onCancel,
  regenerateDisabled,
}: DraftHeaderActionsProps) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
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

      <span aria-hidden="true" className="h-4 w-px bg-border/70" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="h-6 gap-1 rounded-[5px] px-2 text-[11px]"
            disabled={!canApply || isStreaming}
            onClick={onReplace}
            aria-label={replaceLabel}
          >
            <Check className="h-3 w-3" />
            Replace
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{replaceLabel}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-[5px] text-muted-foreground hover:text-foreground"
            disabled={!canApply || isStreaming}
            onClick={onInsert}
            aria-label={insertLabel}
          >
            <CornerDownLeft className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{insertLabel}</TooltipContent>
      </Tooltip>

      {isStreaming ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-6 w-6 rounded-[5px] text-muted-foreground hover:text-foreground"
              onClick={onCancel}
              aria-label="Cancel generation"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Cancel generation</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-[5px] text-muted-foreground hover:text-foreground"
              onClick={onRegenerate}
              disabled={regenerateDisabled}
              aria-label="Regenerate draft"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Regenerate draft</TooltipContent>
        </Tooltip>
      )}
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
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm",
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-1.5">
        <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
    <div className="h-full min-h-0 overflow-y-auto px-3 py-3 text-xs leading-[1.4]">
      {children}
    </div>
  );
}

function RawText({ children }: { children: React.ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap break-words text-xs leading-[1.4] text-foreground">
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
