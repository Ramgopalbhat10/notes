"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useEditorStore } from "@/stores/editor";
import type { AiActionType } from "@/components/vault-workspace/types";

import { AssistantDraftCard } from "./assistant-draft-card";
import { AssistantEmptyState } from "./assistant-empty-state";
import { AssistantHeader } from "./assistant-header";
import { AssistantRefineComposer } from "./assistant-refine-composer";
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

    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setAllowSplitCompare(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const replaceLabel =
    session.contextMode === "selection" ? "Replace selection" : "Replace document";
  const insertLabel =
    session.contextMode === "selection" ? "Insert below selection" : "Insert at cursor";
  const originalTitle =
    session.contextMode === "selection" ? "Original selection" : "Original note";
  const currentFileName = fileKey?.split("/").pop() ?? "current note";
  const disabled = editorStatus === "loading" || !hasDocumentContent || isStreaming;
  const showComparePanel = allowSplitCompare && session.compareMode;
  const hasActionSelected = Boolean(session.action);

  // Primary status line. We keep this tight so the header stays one row tall
  // in the steady state and only expands visually when something is happening.
  const statusMessage =
    session.status === "error"
      ? session.error ?? "AI request failed."
      : session.status === "cancelled"
        ? "AI request cancelled."
        : session.truncated
          ? "The source was partially processed."
          : null;

  const handleSelectAction = useCallback(
    (action: AiActionType) => {
      if (hasActionSelected) {
        void rerunAction(action);
        return;
      }
      void triggerAction(action, "document");
    },
    [hasActionSelected, rerunAction, triggerAction],
  );

  const handleRegenerate = useCallback(() => {
    if (!session.action) return;
    void rerunAction();
  }, [rerunAction, session.action]);

  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col text-[13px]">
      <AssistantHeader
        activeAction={session.action}
        actionsDisabled={disabled}
        onSelectAction={handleSelectAction}
        showActionCluster={hasActionSelected}
        compareAvailable={allowSplitCompare}
        compareMode={session.compareMode}
        canCompare={Boolean(session.result) || Boolean(originalText)}
        onToggleCompare={() => setCompareMode(!session.compareMode)}
        canCopy={session.result.trim().length > 0}
        onCopy={() => void copyResult()}
        onClear={resetSession}
        status={session.status}
        statusMessage={statusMessage}
      />

      {hasActionSelected ? (
        <>
          <AssistantDraftCard
            originalTitle={originalTitle}
            originalText={originalText}
            result={session.result}
            showComparePanel={showComparePanel}
            showRaw={showRaw}
            onShowRawChange={setShowRaw}
            isStreaming={isStreaming}
            canApply={canApply}
            replaceLabel={replaceLabel}
            insertLabel={insertLabel}
            onReplace={applyReplace}
            onInsert={applyInsert}
            onRegenerate={handleRegenerate}
            onCancel={cancel}
            regenerateDisabled={!session.action}
          />
          <AssistantRefineComposer
            value={instruction}
            onValueChange={setInstruction}
            onSubmit={() => void refineAction(instruction)}
            onStop={cancel}
            isStreaming={isStreaming}
            canSubmit={Boolean(instruction.trim()) && Boolean(session.action)}
            portalContainer={portalContainer}
          />
        </>
      ) : (
        <AssistantEmptyState
          currentFileName={currentFileName}
          disabled={disabled}
          onQuickAction={(action) => void triggerAction(action, "document")}
        />
      )}
    </div>
  );
}
