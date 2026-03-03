"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { slugifySegment, pathSegmentsForSlug } from "@/lib/tree/utils";
import { useEditorStore } from "@/stores/editor";
import { useTreeStore } from "@/stores/tree";
import { useWorkspaceLayoutStore } from "@/stores/layout";
import { useSettingsStore } from "@/stores/settings";
import { useToast } from "@/hooks/use-toast";

import { useAiSession } from "./hooks/use-ai-session";
import { useFileSharing } from "./hooks/use-file-sharing";
import { useResolvedPath } from "./hooks/use-resolved-path";
import { useSiblingNavigation } from "./hooks/use-sibling-navigation";
import { useWorkspaceFileSync } from "./hooks/use-workspace-file-sync";
import { useWorkspaceHeader } from "./hooks/use-workspace-header";
import { useWorkspaceSettingsSync } from "./hooks/use-workspace-settings-sync";
import { AiResultPanel } from "./sections/ai-result-panel";
import { WorkspaceBody } from "./sections/workspace-body";
import type { BreadcrumbSegment } from "./types";

export function VaultWorkspace({
  className,
  onHeaderChange,
  onOpenChatSidebar,
  onOpenOutlineSidebar,
}: {
  className?: string;
  onHeaderChange?: (node: ReactNode | null) => void;
  onOpenChatSidebar?: () => void;
  onOpenOutlineSidebar?: () => void;
}) {
  const selectedPath = useTreeStore((state) => {
    const id = state.selectedId;
    if (!id) {
      return null;
    }
    const node = state.nodes[id];
    return node && node.type === "file" ? node.path : null;
  });
  const selectedId = useTreeStore((state) => state.selectedId);
  const select = useTreeStore((state) => state.select);
  const deleteNode = useTreeStore((state) => state.deleteNode);
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
  const setCentered = useWorkspaceLayoutStore((state) => state.setCentered);
  const toggleCentered = useWorkspaceLayoutStore((state) => state.toggleCentered);

  // Settings
  const settings = useSettingsStore((state) => state.settings);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const settingsInitialized = useSettingsStore((state) => state.initialized);

  useWorkspaceSettingsSync({
    fetchSettings,
    settingsInitialized,
    centeredLayout: settings.appearance.centeredLayout,
    setCentered,
  });

  const hasFile = Boolean(selectedPath);
  const hasDocumentContent = Boolean(content.trim().length);

  useWorkspaceFileSync({
    selectedPath,
    fileKey,
    loadFile,
    reset,
    dirty,
  });

  // Resolve the display path: use selected file path if available, otherwise try to resolve routeTarget path
  const nodes = useTreeStore((state) => state.nodes);
  const rootIds = useTreeStore((state) => state.rootIds);

  const resolvedPath = useResolvedPath({
    selectedPath,
    routeTarget,
    nodes,
    rootIds,
  });

  const segments = useMemo(() => (resolvedPath ? buildSegments(resolvedPath) : []), [resolvedPath]);

  const { canNavigatePrev, canNavigateNext, handleNavigatePrev, handleNavigateNext } = useSiblingNavigation({
    selectedId,
    nodes,
    select,
  });

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

  const { sharingState, handleTogglePublic, handleCopyPublicLink } = useFileSharing({
    shareKey,
    publicUrl,
    toast,
  });

  const handleDownload = useCallback((format: "markdown" | "text" | "pdf") => {
    if (!selectedPath || !content) {
      return;
    }
    if (format !== "markdown") {
      toast({
        title: "Format not supported",
        description: `${format.toUpperCase()} export is coming soon.`,
      });
      return;
    }
    // Get filename from path
    const pathParts = selectedPath.split("/");
    const fileName = pathParts[pathParts.length - 1] || "document.md";

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Downloaded", description: `Saved as ${fileName}` });
  }, [content, selectedPath, toast]);

  const handleDelete = useCallback(async () => {
    if (!selectedId || !selectedPath) return;
    const fileName = selectedPath.split("/").pop() ?? "file";
    try {
      await deleteNode(selectedId);
      toast({ title: "Deleted", description: `Deleted "${fileName}"` });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete",
        variant: "destructive"
      });
    }
  }, [selectedId, selectedPath, deleteNode, toast]);

  const headerContent = useWorkspaceHeader({
    segments,
    mode,
    onToggleMode: () => setMode(mode === "preview" ? "edit" : "preview"),
    onSave: handleSave,
    canSave: dirty && status !== "saving" && status !== "conflict",
    saving: status === "saving",
    aiBusy: aiStreaming,
    aiDisabled: !hasFile || status === "loading" || !hasDocumentContent || aiStreaming,
    onTriggerAction: (action) => {
      void start(action);
    },
    hasFile,
    onOpenChatSidebar,
    onOpenOutlineSidebar,
    sharingState,
    onTogglePublic: handleTogglePublic,
    onCopyPublicLink: handleCopyPublicLink,
    centered,
    onToggleCentered: toggleCentered,
    canNavigatePrev,
    canNavigateNext,
    onNavigatePrev: handleNavigatePrev,
    onNavigateNext: handleNavigateNext,
    onDownload: handleDownload,
    onDelete: handleDelete,
  });

  useEffect(() => {
    onHeaderChange?.(headerContent);
    return () => onHeaderChange?.(null);
  }, [headerContent, onHeaderChange]);

  const body = (
    <WorkspaceBody
      selectedPath={selectedPath}
      routeTarget={routeTarget}
      resolvedPath={resolvedPath}
      refreshTree={refreshTree}
      refreshState={refreshState}
      status={status}
      errorSource={errorSource}
      error={error}
      mode={mode}
      content={content}
      setContent={setContent}
    />
  );

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
  const parts = cleaned.split("/");
  return parts.map((label, index) => {
    const isLast = index === parts.length - 1;
    // Build cumulative path for parent folders (with trailing slash for folder navigation)
    const cumulativePath = isLast ? null : parts.slice(0, index + 1).join("/") + "/";
    return { label, path: cumulativePath };
  });
}
