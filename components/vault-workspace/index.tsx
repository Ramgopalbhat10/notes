"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";

import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectedFilePlaceholder } from "@/components/selected-file-placeholder";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { useTreeStore } from "@/stores/tree";
import { useToast } from "@/hooks/use-toast";

import { AiResultPanel } from "./ai-result-panel";
import { WorkspaceHeader } from "./header";
import { useAiSession } from "./use-ai-session";
import { WorkspaceStatusBar } from "./status-bar";
import type { BreadcrumbSegment } from "./types";

export function VaultWorkspace({
  className,
  onHeaderChange,
  onToggleRight,
}: {
  className?: string;
  onHeaderChange?: (node: ReactNode | null) => void;
  onToggleRight?: () => void;
}) {
  const selectedPath = useTreeStore((state) => {
    const id = state.selectedId;
    if (!id) {
      return null;
    }
    const node = state.nodes[id];
    return node && node.type === "file" ? node.path : null;
  });
  const routeTarget = useTreeStore((state) => state.routeTarget);
  const refreshTree = useTreeStore((state) => state.refreshTree);
  const refreshState = useTreeStore((state) => state.refreshState);

  const fileKey = useEditorStore((state) => state.fileKey);
  const content = useEditorStore((state) => state.content);
  const status = useEditorStore((state) => state.status);
  const error = useEditorStore((state) => state.error);
  const errorSource = useEditorStore((state) => state.errorSource);
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const setContent = useEditorStore((state) => state.setContent);
  const dirty = useEditorStore((state) => state.dirty);
  const lastSavedAt = useEditorStore((state) => state.lastSavedAt);
  const conflictMessage = useEditorStore((state) => state.conflictMessage);
  const loadFile = useEditorStore((state) => state.loadFile);
  const reset = useEditorStore((state) => state.reset);
  const save = useEditorStore((state) => state.save);
  const selection = useEditorStore((state) => state.selection);
  const applyAiResult = useEditorStore((state) => state.applyAiResult);
  const { toast } = useToast();

  const hasFile = Boolean(selectedPath);
  const hasDocumentContent = Boolean(content.trim().length);

  useEffect(() => {
    if (selectedPath) {
      if (selectedPath !== fileKey) {
        void loadFile(selectedPath);
      }
    } else {
      reset();
    }
  }, [fileKey, loadFile, reset, selectedPath]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const segments = useMemo(() => (selectedPath ? buildSegments(selectedPath) : []), [selectedPath]);

  const handleRetrySave = useCallback(() => {
    void save("manual");
  }, [save]);

  const handleSave = useCallback(() => {
    if (!dirty || status === "saving" || status === "conflict") {
      return;
    }
    void save("manual");
  }, [dirty, save, status]);

  const handleReloadRemote = () => {
    if (!fileKey) {
      return;
    }
    if (dirty) {
      const confirmed = window.confirm(
        "Reloading the remote file will discard your unsaved changes. Continue?",
      );
      if (!confirmed) {
        return;
      }
    }
    void loadFile(fileKey);
  };

  const {
    state: aiState,
    panelOpen,
    isStreaming: aiStreaming,
    start,
    cancel,
    closePanel,
    retry,
    applyReplace,
    applyInsert,
    copyResult,
    canApply,
  } = useAiSession({
    fileKey,
    content,
    selection,
    status,
    hasDocumentContent,
    toast,
    applyAiResult,
    setMode,
  });

  const headerContent = useMemo(
    () => (
      <WorkspaceHeader
        segments={segments}
        mode={mode}
        onToggleMode={() => setMode(mode === "preview" ? "edit" : "preview")}
        onSave={handleSave}
        canSave={mode === "edit" && dirty && status !== "saving" && status !== "conflict"}
        saving={status === "saving"}
        aiBusy={aiStreaming}
        aiDisabled={!hasFile || status === "loading" || !hasDocumentContent || aiStreaming}
        onTriggerAction={(action) => {
          void start(action);
        }}
        hasFile={hasFile}
        onToggleRight={onToggleRight}
      />
    ),
    [aiStreaming, dirty, handleSave, hasDocumentContent, hasFile, mode, onToggleRight, segments, setMode, start, status],
  );

  useEffect(() => {
    onHeaderChange?.(headerContent);
    return () => onHeaderChange?.(null);
  }, [headerContent, onHeaderChange]);

  const body = useMemo(() => {
    if (!selectedPath) {
      if (routeTarget) {
        const isMissing = routeTarget.status === "missing";
        const title = isMissing ? "File unavailable" : "Folder is empty";
        const description = isMissing
          ? `The path "${routeTarget.path}" could not be found. It may have been moved or deleted.`
          : `Folder "${routeTarget.path.replace(/\/$/, "")}" does not contain any files yet.`;
        return (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
            <div className="font-medium">{title}</div>
            <p className="text-muted-foreground">{description}</p>
            <Button
              size="sm"
              className="w-fit"
              onClick={() => void refreshTree()}
              disabled={refreshState !== "idle"}
            >
              {refreshState === "idle" ? "Refresh tree" : "Refreshing..."}
            </Button>
          </div>
        );
      }
      return <SelectedFilePlaceholder />;
    }
    if (status === "loading") {
      return (
        <div className="space-y-2">
          <Skeleton className="h-6 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-9/12" />
        </div>
      );
    }

    if (status === "error" && errorSource === "load") {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="font-medium text-destructive">Failed to load file</div>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </div>
      );
    }

    if (mode === "edit") {
      return <MarkdownEditor value={content} onChange={setContent} />;
    }

    return (
      <div className="rounded-lg border bg-card p-3 md:p-6 w-full overflow-hidden">
        <MarkdownPreview content={content} />
      </div>
    );
  }, [content, error, errorSource, mode, refreshState, refreshTree, routeTarget, selectedPath, setContent, status]);

  const aiPanelVisible = hasFile && panelOpen && aiState.status !== "idle";

  return (
    <div className={cn("space-y-4 min-w-0 w-full max-w-full", className)}>
      {aiPanelVisible ? (
        <AiResultPanel
          state={aiState}
          onClose={closePanel}
          onCancel={cancel}
          onRetry={retry}
          onCopy={copyResult}
          onInsert={applyInsert}
          onReplace={applyReplace}
          canApply={canApply}
        />
      ) : null}
      {body}
      {hasFile ? (
        <WorkspaceStatusBar
          status={status}
          dirty={dirty}
          lastSavedAt={lastSavedAt}
          error={error}
          conflictMessage={conflictMessage}
          onRetrySave={status === "error" && errorSource === "save" ? handleRetrySave : undefined}
          onReloadRemote={status === "conflict" ? handleReloadRemote : undefined}
          errorSource={errorSource}
        />
      ) : null}
    </div>
  );
}

function buildSegments(path: string): BreadcrumbSegment[] {
  const cleaned = path.endsWith("/") ? path.slice(0, -1) : path;
  if (!cleaned) {
    return [];
  }
  return cleaned.split("/").map((label) => ({ label }));
}
