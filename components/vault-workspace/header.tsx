import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, Eye, FilePenLine, Globe, Link, Loader2, Lock, MessageSquare, Save } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { AiActionDropdown } from "./ai-action-dropdown";
import type { AiActionType, BreadcrumbSegment } from "./types";

type SharingState = {
  isPublic: boolean;
  loading: boolean;
  updating: boolean;
  shareUrl: string | null;
};

export type WorkspaceHeaderProps = {
  segments: BreadcrumbSegment[];
  mode: "preview" | "edit";
  onToggleMode: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  onTriggerAction: (action: AiActionType) => void;
  aiBusy: boolean;
  aiDisabled: boolean;
  hasFile: boolean;
  onToggleRight?: () => void;
  sharingState?: SharingState;
  onTogglePublic?: () => void;
  onCopyPublicLink?: () => void;
};

export function WorkspaceHeader({
  segments,
  mode,
  onToggleMode,
  onSave,
  canSave,
  saving,
  onTriggerAction,
  aiBusy,
  aiDisabled,
  hasFile,
  onToggleRight,
  sharingState,
  onTogglePublic,
  onCopyPublicLink,
}: WorkspaceHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [useCompactMode, setUseCompactMode] = useState(false);
  const fileName = segments[segments.length - 1]?.label ?? "";

  const shareButtonDisabled =
    !hasFile || !sharingState || sharingState.loading || sharingState.updating || !onTogglePublic;
  const shareTooltip = !hasFile
    ? "Select a file to manage sharing"
    : sharingState?.loading
      ? "Loading sharing status..."
      : sharingState?.isPublic
        ? "Public link is active. Click to make private."
        : "Enable a public link so anyone with the link can view this file.";
  const canCopyPublicLink = Boolean(
    hasFile && sharingState?.isPublic && sharingState.shareUrl && onCopyPublicLink && !sharingState.updating,
  );
  const iconButtonClass =
    "size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40";

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    // Simple check: does header have enough width?
    const checkWidth = () => {
      // If header width is less than 600px, show compact mode (filename only)
      setUseCompactMode(headerEl.offsetWidth < 600);
    };

    checkWidth();
    
    const resizeObserver = new ResizeObserver(checkWidth);
    resizeObserver.observe(headerEl);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <TooltipProvider>
      <div ref={headerRef} className="flex w-full items-center gap-0.5">
        <div className="flex-1 min-w-0 text-sm text-muted-foreground" role="presentation">
          {hasFile && segments.length > 0 ? (
            <>
              {/* Mobile: always show filename only */}
              <span className="block md:hidden truncate font-medium text-foreground" title={fileName}>
                {fileName}
              </span>
              {/* Desktop: show full breadcrumb or filename based on available width */}
              {useCompactMode ? (
                <span className="hidden md:block truncate font-medium text-foreground" title={fileName}>
                  {fileName}
                </span>
            ) : (
              <div className="hidden md:flex items-center gap-0.5 whitespace-nowrap">
                {segments.map((segment, index) => {
                  const isLast = index === segments.length - 1;
                  return (
                    <div key={`${segment.label}-${index}`} className="flex items-center gap-0.5 shrink-0">
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <span className={cn("shrink-0", isLast ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {segment.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <span className="truncate font-medium text-foreground">Select a file</span>
        )}
        </div>
        <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
          {hasFile ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className={iconButtonClass}
                onClick={onToggleMode}
                aria-label={mode === "preview" ? "Switch to edit mode" : "Switch to preview mode"}
              >
                {mode === "preview" ? <FilePenLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              {mode === "edit" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconButtonClass}
                  onClick={onSave}
                  disabled={!canSave}
                  aria-label="Save changes"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </Button>
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        iconButtonClass,
                        sharingState?.isPublic ? "text-emerald-500" : undefined,
                      )}
                      onClick={() => {
                        if (!shareButtonDisabled && sharingState) {
                          onTogglePublic?.();
                        }
                      }}
                      disabled={shareButtonDisabled}
                      aria-pressed={sharingState?.isPublic ?? false}
                      aria-label={sharingState?.isPublic ? "Disable public link" : "Enable public link"}
                    >
                      {sharingState?.loading || sharingState?.updating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : sharingState?.isPublic ? (
                        <Globe className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">{shareTooltip}</TooltipContent>
              </Tooltip>
              {canCopyPublicLink ? (
                <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={iconButtonClass}
                        onClick={onCopyPublicLink}
                        aria-label="Copy public link"
                      >
                        <Link className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Copy public link</TooltipContent>
                </Tooltip>
              ) : null}
            </>
          ) : null}
          <AiActionDropdown disabled={aiDisabled} busy={aiBusy} onSelect={onTriggerAction} />
          <Button
            variant="ghost"
            size="icon"
            className={iconButtonClass}
            onClick={onToggleRight}
            disabled={!onToggleRight}
            aria-label="Open chat panel"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
