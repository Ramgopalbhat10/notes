"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "@/components/ai-chat/model-selector";
import { AI_ACTIONS, ACTION_LABEL } from "@/components/vault-workspace/constants";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { useAiActionController } from "./hooks/use-ai-action-controller";

export function AiAssistantSidebar() {
  const fileKey = useEditorStore((state) => state.fileKey);
  const editorStatus = useEditorStore((state) => state.status);
  const rootRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [instruction, setInstruction] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [allowSplitCompare, setAllowSplitCompare] = useState(false);

  const {
    session,
    originalText,
    isStreaming,
    canApply,
    hasDocumentContent,
    triggerAction,
    rerunAction,
    refineAction,
    cancel,
    applyReplace,
    applyInsert,
    copyResult,
    setCompareMode,
    resetSession,
  } = useAiActionController();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      setPortalContainer(null);
      return;
    }
    const sheetContent = root.closest("[data-slot='sheet-content']");
    setPortalContainer(sheetContent instanceof HTMLElement ? sheetContent : null);
  }, []);

  useEffect(() => {
    if (session.status === "success") {
      setInstruction("");
    }
  }, [session.status]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setAllowSplitCompare(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const replaceLabel = session.contextMode === "selection" ? "Replace selection" : "Replace document";
  const insertLabel = session.contextMode === "selection" ? "Insert below selection" : "Insert at cursor";
  const disabled = editorStatus === "loading" || !hasDocumentContent || isStreaming;
  const originalTitle = session.contextMode === "selection" ? "Original selection" : "Original note";
  const currentFileName = fileKey?.split("/").pop() ?? "current note";
  const showComparePanel = allowSplitCompare && session.compareMode;
  const statusMessage = session.status === "error"
    ? session.error ?? "AI request failed."
    : session.status === "cancelled"
      ? "AI request cancelled."
      : session.status === "streaming"
        ? "Generating a new draft…"
        : session.truncated
          ? "The source was partially processed."
          : "";

  const emptyState = useMemo(
    () => (
      <div className="flex h-full flex-col justify-center px-3 py-6">
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-4 text-center">
          <h3 className="text-sm font-semibold text-foreground">AI editing workspace</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start from the header for whole-note work or highlight text in edit or preview mode for a focused rewrite.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
          Context comes from {currentFileName}.
          </p>
        </div>
      </div>
    ),
    [currentFileName],
  );

  return (
    <div ref={rootRef} className="flex h-full flex-col text-[13px]">
      <div className="border-b border-border/50 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {AI_ACTIONS.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={item.value === session.action ? "secondary" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => {
                  if (session.action) {
                    void rerunAction(item.value);
                    return;
                  }
                  void triggerAction(item.value, "document");
                }}
              >
                <item.icon className="mr-2 h-4 w-4 text-primary" />
                {item.label}
              </Button>
            ))}
          </div>
          {session.action ? (
            <div className="flex items-center gap-1">
              {allowSplitCompare ? (
                <Button
                  type="button"
                  variant={session.compareMode ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCompareMode(!session.compareMode)}
                  disabled={!session.result && !originalText}
                  aria-label={session.compareMode ? "Hide original text" : "Compare with original text"}
                >
                  {session.compareMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => void copyResult()}
                disabled={!session.result.trim()}
                aria-label="Copy AI draft"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetSession}
                aria-label="Clear assistant draft"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
        {statusMessage ? (
          <p className={cn("mt-2 text-xs", session.status === "error" ? "text-destructive" : "text-muted-foreground")}>
            {statusMessage}
          </p>
        ) : null}
      </div>

      {session.action ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className={cn("grid gap-3", showComparePanel && "grid-cols-2")}>
              {showComparePanel ? (
                <article className="overflow-hidden rounded-lg border border-border bg-muted/20">
                  <div className="border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {originalTitle}
                  </div>
                  <div className="max-h-[32rem] overflow-y-auto px-3 py-3">
                    {showRaw ? (
                      <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{originalText}</pre>
                    ) : (
                      <MarkdownPreview content={originalText} />
                    )}
                  </div>
                </article>
              ) : null}

              <article className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">AI draft</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-xs"
                    onClick={() => setShowRaw((value) => !value)}
                  >
                    {showRaw ? "Preview" : "Raw"}
                  </Button>
                </div>
                <div className="max-h-[32rem] overflow-y-auto px-3 py-3 text-xs leading-5">
                  {session.result ? (
                    showRaw ? (
                      <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-foreground">{session.result}</pre>
                    ) : (
                      <MarkdownPreview content={session.result} className="assistant-markdown text-xs leading-5" />
                    )
                  ) : (
                    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                      {isStreaming ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Working on your draft…
                        </span>
                      ) : (
                        "Run an action to generate a draft."
                      )}
                    </div>
                  )}
                </div>
              </article>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={!canApply || isStreaming} onClick={applyReplace}>
                <Check className="mr-2 h-4 w-4" />
                {replaceLabel}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!canApply || isStreaming} onClick={applyInsert}>
                {insertLabel}
              </Button>
              {isStreaming ? (
                <Button type="button" variant="outline" size="sm" onClick={cancel}>
                  Cancel
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => void rerunAction()} disabled={!session.action}>
                  Regenerate
                </Button>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            <div className="rounded-lg border border-border bg-muted/30">
              <div className="px-3 pt-3">
                <Textarea
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder="Refine this draft, change tone, make it shorter, or ask for more detail…"
                  rows={3}
                  disabled={isStreaming}
                  className="min-h-[72px] resize-none border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center justify-between px-3 pb-3 pt-2">
                <ModelSelector portalContainer={portalContainer} />
                <Button
                  type="button"
                  size="sm"
                  onClick={isStreaming ? cancel : () => void refineAction(instruction)}
                  disabled={isStreaming ? false : !instruction.trim() || !session.action}
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Stop
                    </>
                  ) : (
                    "Refine draft"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        emptyState
      )}
    </div>
  );
}
