"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";

import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectedFilePlaceholder } from "@/components/selected-file-placeholder";
import { cn } from "@/lib/utils";
import { slugifySegment, pathSegmentsForSlug } from "@/lib/tree/utils";
import { useEditorStore } from "@/stores/editor";
import { useTreeStore } from "@/stores/tree";
import { usePublicStore } from "@/stores/public";
import { useWorkspaceLayoutStore } from "@/stores/layout";
import { useToast } from "@/hooks/use-toast";

import { AiResultPanel } from "./ai-result-panel";
import { WorkspaceHeader } from "./header";
import { useAiSession } from "./use-ai-session";
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
  const loadFile = useEditorStore((state) => state.loadFile);
  const reset = useEditorStore((state) => state.reset);
  const save = useEditorStore((state) => state.save);
  const selection = useEditorStore((state) => state.selection);
  const applyAiResult = useEditorStore((state) => state.applyAiResult);
  const { toast } = useToast();
  const centered = useWorkspaceLayoutStore((state) => state.centered);
  const toggleCentered = useWorkspaceLayoutStore((state) => state.toggleCentered);

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

  const handleSave = useCallback(() => {
    if (!dirty || status === "saving" || status === "conflict") {
      return;
    }
    void save("manual");
  }, [dirty, save, status]);

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

  const shareKey = selectedPath;
  const shareRecord = usePublicStore((state) => (shareKey ? state.records[shareKey] : undefined));
  const loadShareState = usePublicStore((state) => state.load);
  const toggleShareState = usePublicStore((state) => state.toggle);

  useEffect(() => {
    if (shareKey) {
      void loadShareState(shareKey);
    }
  }, [shareKey, loadShareState]);

  const publicPath = useMemo(() => (shareKey ? buildPublicPath(shareKey) : null), [shareKey]);
  const publicUrl = useMemo(() => {
    if (!publicPath) {
      return null;
    }
    if (typeof window === "undefined") {
      return publicPath;
    }
    try {
      return new URL(publicPath, window.location.origin).toString();
    } catch {
      return `${window.location.origin}${publicPath}`;
    }
  }, [publicPath]);

  const shareRecordPublic = Boolean(shareRecord?.public);
  const shareRecordLoading = Boolean(shareRecord?.loading);
  const shareRecordUpdating = Boolean(shareRecord?.updating);
  const shareRecordHasData = Boolean(shareRecord);

  const sharingState = useMemo(
    () =>
      shareKey
        ? {
            isPublic: shareRecordPublic,
            loading: !shareRecordHasData || shareRecordLoading,
            updating: shareRecordUpdating,
            shareUrl: shareRecordPublic && publicUrl ? publicUrl : null,
          }
        : undefined,
    [shareKey, shareRecordPublic, shareRecordHasData, shareRecordLoading, shareRecordUpdating, publicUrl],
  );

  const lastShareErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!shareRecord?.error) {
      lastShareErrorRef.current = null;
      return;
    }
    if (shareRecord.error === lastShareErrorRef.current) {
      return;
    }
    lastShareErrorRef.current = shareRecord.error;
    toast({
      title: "Sharing update failed",
      description: shareRecord.error,
      variant: "destructive",
    });
  }, [shareRecord?.error, toast]);

  const handleTogglePublic = useCallback(() => {
    if (!shareKey) {
      return;
    }
    if (!sharingState || sharingState.loading || sharingState.updating) {
      return;
    }
    const next = !(sharingState.isPublic ?? false);
    void toggleShareState(shareKey, next).then((success) => {
      if (success) {
        toast({
          title: next ? "Public link enabled" : "Public link disabled",
          description: next && publicUrl ? "Anyone with the link can view this file." : undefined,
        });
      }
    });
  }, [shareKey, sharingState, toggleShareState, toast, publicUrl]);

  const handleCopyPublicLink = useCallback(async () => {
    if (!sharingState?.shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(sharingState.shareUrl);
      toast({
        title: "Public link copied",
        description: "Share it with anyone to give read-only access.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy the public link. Try again.",
        variant: "destructive",
      });
    }
  }, [sharingState?.shareUrl, toast]);

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
        sharingState={hasFile ? sharingState : undefined}
        onTogglePublic={hasFile ? handleTogglePublic : undefined}
        onCopyPublicLink={hasFile ? handleCopyPublicLink : undefined}
        centered={centered}
        onToggleCentered={toggleCentered}
      />
    ),
    [
      aiStreaming,
      centered,
      dirty,
      handleCopyPublicLink,
      handleSave,
      toggleCentered,
      handleTogglePublic,
      hasDocumentContent,
      hasFile,
      mode,
      onToggleRight,
      segments,
      setMode,
      sharingState,
      start,
      status,
    ],
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
        <div className="space-y-2 pt-4 md:pt-6">
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
      <div className="rounded-lg w-full overflow-hidden px-4 md:px-0">
        <MarkdownPreview content={content} />
      </div>
    );
  }, [content, error, errorSource, mode, refreshState, refreshTree, routeTarget, selectedPath, setContent, status]);

  const aiPanelVisible = hasFile && panelOpen && aiState.status !== "idle";

  const contentMaxWidth = centered ? "64rem" : "100%";

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <div
        className="space-y-4 w-full transition-[max-width] duration-300 ease-in-out mx-auto"
        style={{ maxWidth: contentMaxWidth }}
      >
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
      </div>
    </div>
  );
}

function buildPublicPath(path: string): string {
  const segments = pathSegmentsForSlug(path);
  if (segments.length === 0) {
    return "/p";
  }

  const slugSegments = segments.map((segment, index) => {
    // Strip .md extension only from the last segment (the file name)
    const isLastSegment = index === segments.length - 1;
    return slugifySegment(segment, isLastSegment);
  });

  return `/p/${slugSegments.join("/")}`;
}

function buildSegments(path: string): BreadcrumbSegment[] {
  const cleaned = path.endsWith("/") ? path.slice(0, -1) : path;
  if (!cleaned) {
    return [];
  }
  return cleaned.split("/").map((label) => ({ label }));
}
