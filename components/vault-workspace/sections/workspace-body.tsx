"use client";

import { Button } from "@/components/ui/button";
import type { AiActionSelectionSource } from "@/components/ai-actions/types";
import { PreviewSelectionSurface } from "@/components/ai-actions/preview-selection-surface";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectedFilePlaceholder } from "@/components/selected-file-placeholder";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownPreview } from "@/components/markdown-preview";
import { History, X } from "lucide-react";
import type { RouteTargetState } from "@/lib/tree/types";
import type { AiActionType } from "../types";

type ViewingVersion = {
  id: string;
  content: string;
  createdAt: string;
};

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
  onSelectionAction?: (action: AiActionType, source?: AiActionSelectionSource) => void;
  selectionAiBusy?: boolean;
  viewingVersion?: ViewingVersion | null;
  onCloseVersionPreview?: () => void;
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
  viewingVersion,
  onCloseVersionPreview,
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

  // Version preview mode: read-only render of a historical snapshot
  if (viewingVersion) {
    const versionDate = new Date(viewingVersion.createdAt);
    const formattedDate = Number.isNaN(versionDate.getTime())
      ? ""
      : versionDate.toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          <History className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-muted-foreground">
            Viewing version from <span className="font-medium text-foreground">{formattedDate}</span> — this is a historical snapshot.
          </span>
          {onCloseVersionPreview && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onCloseVersionPreview}
              aria-label="Close version preview"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </Button>
          )}
        </div>
        <MarkdownPreview content={viewingVersion.content} />
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
      onSelectAction={(action, source) => onSelectionAction?.(action, source)}
    />
  );
}
