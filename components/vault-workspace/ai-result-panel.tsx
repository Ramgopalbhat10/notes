import { useEffect, useState } from "react";

import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff, Loader2, Sparkles, X, Check } from "lucide-react";

import { ACTION_LABEL } from "./constants";
import type { AiSessionState } from "./types";

export type AiResultPanelProps = {
  state: AiSessionState;
  onClose: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onCopy: () => void;
  onInsert: () => void;
  onReplace: () => void;
  canApply: boolean;
};

export function AiResultPanel({
  state,
  onClose,
  onCancel,
  onRetry,
  onCopy,
  onInsert,
  onReplace,
  canApply,
}: AiResultPanelProps) {
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    setShowPreview(false);
  }, [state.action, state.status]);

  const isStreaming = state.status === "streaming";
  const isError = state.status === "error";
  const isCancelled = state.status === "cancelled";
  const hasResult = Boolean(state.result);
  const replaceLabel = state.usedSelection ? "Replace selection" : "Replace document";
  const insertLabel = state.usedSelection ? "Insert without replacing" : "Insert at cursor";
  const statusMessage = isError
    ? state.error ?? "AI request failed."
    : isCancelled
      ? "AI request cancelled."
      : isStreaming
        ? "Generating AI output…"
        : "AI result ready.";
  const statusClass = isError ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border/70 bg-card/80 p-4 shadow-sm w-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>{state.action ? ACTION_LABEL[state.action] : "AI Result"}</span>
            {state.truncated ? (
              <span className="inline-flex items-center rounded-full border border-amber-400/70 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                Input truncated
              </span>
            ) : null}
            {isStreaming ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Streaming
              </span>
            ) : null}
          </div>
          <p className={`mt-1 text-xs ${statusClass}`}>{statusMessage}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Close AI result panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 max-h-64 overflow-auto rounded-md border border-border/60 bg-background p-3 text-sm leading-relaxed">
        {hasResult ? (
          showPreview ? (
            <MarkdownPreview content={state.result} />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-foreground">{state.result}</pre>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {isError ? "No output was generated." : "Waiting for the model to respond…"}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isStreaming ? (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {(isError || isCancelled) && state.action ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        {canApply && !isStreaming && !isError ? (
          <>
            <Button size="sm" onClick={onReplace}>
              <Check className="mr-2 h-4 w-4" />
              {replaceLabel}
            </Button>
            <Button variant="outline" size="sm" onClick={onInsert}>
              {insertLabel}
            </Button>
          </>
        ) : null}
        <Button
          variant="outline"
          size="icon"
          onClick={onCopy}
          disabled={!hasResult}
          className="ml-auto"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant={showPreview ? "secondary" : "outline"}
          size="icon"
          onClick={() => setShowPreview((value) => !value)}
          disabled={!hasResult}
          aria-label={showPreview ? "Show raw Markdown" : "Show rendered preview"}
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
