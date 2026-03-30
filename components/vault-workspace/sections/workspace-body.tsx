"use client";

import { Button } from "@/components/ui/button";
import { PreviewSelectionSurface } from "@/components/ai-actions/preview-selection-surface";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectedFilePlaceholder } from "@/components/selected-file-placeholder";
import { MarkdownEditor } from "@/components/markdown-editor";
import type { RouteTargetState } from "@/lib/tree/types";
import type { AiActionType } from "../types";

type WorkspaceBodyProps = {
  selectedPath: string | null;
  routeTarget: RouteTargetState;
  resolvedPath: string | null;
  refreshTree: () => Promise<void>;
  refreshState: "idle" | "pending" | "running";
  status: "idle" | "loading" | "saving" | "error" | "conflict";
  errorSource: "load" | "save" | null;
  error: string | null;
  mode: "preview" | "edit";
  content: string;
  setContent: (value: string) => void;
  onSelectionAction?: (action: AiActionType, source?: { selectionText: string; sourceView: "preview" | "edit" }) => void;
  selectionAiBusy?: boolean;
};

export function WorkspaceBody({
  selectedPath,
  routeTarget,
  resolvedPath,
  refreshTree,
  refreshState,
  status,
  errorSource,
  error,
  mode,
  content,
  setContent,
  onSelectionAction,
  selectionAiBusy,
}: WorkspaceBodyProps) {
  if (!selectedPath) {
    if (routeTarget) {
      const isMissing = routeTarget.status === "missing";
      const cleanPath = resolvedPath || routeTarget.path;

      const title = isMissing ? "File unavailable" : "Select a file";
      const description = isMissing
        ? `The path "${cleanPath}" could not be found. It may have been moved or deleted.`
        : `You are viewing "${cleanPath}". Select a file from the sidebar to view its content and start editing.`;

      return (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
          <div className="font-medium">{title}</div>
          <p className="text-muted-foreground">{description}</p>
          {isMissing && (
            <Button
              size="sm"
              className="w-fit"
              onClick={() => void refreshTree()}
              disabled={refreshState !== "idle"}
            >
              {refreshState === "idle" ? "Refresh tree" : "Refreshing..."}
            </Button>
          )}
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
    return (
      <MarkdownEditor
        documentKey={selectedPath}
        value={content}
        onChange={setContent}
        onSelectionAction={onSelectionAction}
        selectionAiBusy={selectionAiBusy}
      />
    );
  }

  return (
    <PreviewSelectionSurface
      content={content}
      busy={Boolean(selectionAiBusy)}
      onSelectAction={(action, selectionText) => onSelectionAction?.(action, { selectionText, sourceView: "preview" })}
    />
  );
}
