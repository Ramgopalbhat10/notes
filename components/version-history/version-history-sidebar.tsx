"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, FileText, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getFileVersionsAction,
  getFileVersionContentAction,
  rollbackToVersionAction,
  type FileVersionListItem,
} from "@/app/actions/file-versions";
import { useEditorStore } from "@/stores/editor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatAbsoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VersionHistorySidebar() {
  const fileKey = useEditorStore((state) => state.fileKey);
  const lastModified = useEditorStore((state) => state.lastModified);
  const dirty = useEditorStore((state) => state.dirty);
  const viewingVersion = useEditorStore((state) => state.viewingVersion);
  const setViewingVersion = useEditorStore((state) => state.setViewingVersion);
  const loadFile = useEditorStore((state) => state.loadFile);
  const { toast } = useToast();

  const [versions, setVersions] = useState<FileVersionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const fetchIdRef = useRef(0);

  // Fetch version list when fileKey changes
  useEffect(() => {
    if (!fileKey) {
      setVersions([]);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);

    void (async () => {
      try {
        const result = await getFileVersionsAction({ key: fileKey });
        if (fetchId !== fetchIdRef.current) return;
        if (result.ok) {
          setVersions(result.versions);
        } else {
          setVersions([]);
        }
      } catch {
        if (fetchId === fetchIdRef.current) setVersions([]);
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    })();
  }, [fileKey]);

  // Clear viewing version when switching files
  useEffect(() => {
    if (!fileKey) {
      setViewingVersion(null);
    }
  }, [fileKey, setViewingVersion]);

  const handleSelectCurrent = useCallback(() => {
    setViewingVersion(null);
  }, [setViewingVersion]);

  const handleSelectVersion = useCallback(
    async (version: FileVersionListItem) => {
      if (!fileKey) return;
      if (viewingVersion?.id === version.id) return;

      setLoadingVersionId(version.id);
      try {
        const result = await getFileVersionContentAction({
          key: fileKey,
          versionId: version.id,
        });
        if (result.ok) {
          setViewingVersion({
            id: version.id,
            content: result.content,
            createdAt: result.createdAt,
          });
        } else {
          toast({
            title: "Failed to load version",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Failed to load version",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setLoadingVersionId(null);
      }
    },
    [fileKey, viewingVersion?.id, setViewingVersion, toast],
  );

  const handleRollback = useCallback(
    async (version: FileVersionListItem) => {
      if (!fileKey) return;

      const confirmed = window.confirm(
        `Roll back to the version from ${formatAbsoluteTime(version.createdAt)}?\n\nThe current content will be saved as a new history entry before the rollback.`,
      );
      if (!confirmed) return;

      setRollingBack(true);
      try {
        const result = await rollbackToVersionAction({
          key: fileKey,
          versionId: version.id,
        });
        if (result.ok) {
          setViewingVersion(null);
          await loadFile(fileKey);
          toast({
            title: "Rolled back",
            description: `Restored to version from ${formatAbsoluteTime(version.createdAt)}.`,
          });
          // Refetch versions after rollback
          const refetchId = ++fetchIdRef.current;
          const versionsResult = await getFileVersionsAction({ key: fileKey });
          if (refetchId === fetchIdRef.current && versionsResult.ok) {
            setVersions(versionsResult.versions);
          }
        } else {
          toast({
            title: "Rollback failed",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Rollback failed",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setRollingBack(false);
      }
    },
    [fileKey, loadFile, setViewingVersion, toast],
  );

  if (!fileKey) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        Select a file to view its version history.
      </div>
    );
  }

  const isViewingCurrent = !viewingVersion;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-3">
        {/* Current version */}
        <VersionRow
          label="Current"
          sublabel={
            lastModified
              ? formatAbsoluteTime(lastModified)
              : "Not yet saved"
          }
          badge={dirty ? "Unsaved" : undefined}
          active={isViewingCurrent}
          icon={<FileText className="h-3.5 w-3.5" />}
          onClick={handleSelectCurrent}
        />

        {/* Divider */}
        {versions.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
            <span>History</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
        )}

        {/* Version entries */}
        {loading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5 p-2.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : (
          versions.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground/60">
              No previous versions yet. Save the file to create a version snapshot.
            </div>
          ) : (
            versions.map((version, index) => (
              <VersionRow
                key={version.id}
                label={formatRelativeTime(version.createdAt)}
                sublabel={formatAbsoluteTime(version.createdAt)}
                meta={formatSize(version.size)}
                active={viewingVersion?.id === version.id}
                loading={loadingVersionId === version.id}
                icon={<Clock className="h-3.5 w-3.5" />}
                onClick={() => void handleSelectVersion(version)}
                action={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground/60 hover:text-foreground hover:bg-accent/60"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRollback(version);
                    }}
                    disabled={rollingBack}
                    aria-label="Roll back to this version"
                    title="Roll back to this version"
                  >
                    {rollingBack && viewingVersion?.id === version.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                  </Button>
                }
              />
            ))
          )
        )}
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// VersionRow sub-component
// ---------------------------------------------------------------------------

type VersionRowProps = {
  label: string;
  sublabel: string;
  meta?: string;
  badge?: string;
  active: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  action?: React.ReactNode;
};

function VersionRow({
  label,
  sublabel,
  meta,
  badge,
  active,
  loading,
  icon,
  onClick,
  action,
}: VersionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-accent/60 text-foreground"
          : "hover:bg-accent/40 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-foreground" : "text-muted-foreground/50",
        )}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-medium truncate", active && "text-foreground")}>
            {label}
          </span>
          {badge && (
            <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              {badge}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground/70 truncate">
          {sublabel}
          {meta ? ` · ${meta}` : ""}
        </span>
      </div>
      {action && (
        <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[active=true]:opacity-100" data-active={active}>
          {action}
        </span>
      )}
    </button>
  );
}
