import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceStatusBarProps = {
  status: "idle" | "loading" | "saving" | "error" | "conflict";
  dirty: boolean;
  lastSavedAt: string | null;
  error: string | null;
  conflictMessage: string | null;
  onRetrySave?: () => void;
  onReloadRemote?: () => void;
  errorSource: "load" | "save" | null;
};

export function WorkspaceStatusBar({
  status,
  dirty,
  lastSavedAt,
  error,
  conflictMessage,
  onRetrySave,
  onReloadRemote,
  errorSource,
}: WorkspaceStatusBarProps) {
  if (status === "loading") {
    return null;
  }

  const { message, tone } = (() => {
    if (status === "saving") {
      return { message: "Saving…", tone: "info" } as const;
    }
    if (status === "error") {
      const prefix = errorSource === "load" ? "Failed to load" : "Failed to save";
      const detail = error ? `: ${error}` : "";
      return { message: `${prefix}${detail}`, tone: "error" } as const;
    }
    if (status === "conflict") {
      const detail = conflictMessage ? `: ${conflictMessage}` : "";
      return { message: `Save blocked by remote changes${detail}`, tone: "error" } as const;
    }
    if (dirty) {
      return { message: "Unsaved changes", tone: "warning" } as const;
    }
    const formatted = lastSavedAt ? formatTimestamp(lastSavedAt) : null;
    return { message: formatted ? `Saved • ${formatted}` : "Saved", tone: "idle" } as const;
  })();

  const toneClasses = {
    idle: "text-muted-foreground border-border/60 bg-muted/30",
    info: "text-foreground border-border/60 bg-muted/40",
    warning: "text-foreground border-border/60 bg-muted/40",
    error: "text-destructive border-destructive/40 bg-destructive/10",
  } as const;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border px-3 py-1.5 text-xs",
        toneClasses[tone],
      )}
    >
      <span className="truncate">{message}</span>
      {status === "error" && onRetrySave ? (
        <Button variant="ghost" size="sm" onClick={onRetrySave} className="ml-auto h-7 px-2">
          Retry
        </Button>
      ) : null}
      {status === "conflict" && onReloadRemote ? (
        <Button variant="outline" size="sm" onClick={onReloadRemote} className="ml-auto h-7 px-2">
          Reload remote
        </Button>
      ) : null}
    </div>
  );
}

function formatTimestamp(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const datePart = date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${datePart} ${timePart}`;
}
