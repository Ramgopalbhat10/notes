import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { encodePath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Download,
  Eye,
  FilePenLine,
  Globe,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Minimize,
  Maximize,
  MoreHorizontal,
  Save,
  Trash2,
  CircleHelp,
} from "lucide-react";
import { ShortcutsDialog } from "../shortcuts-help-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AI_ACTIONS } from "./constants";
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
  centered?: boolean;
  onToggleCentered?: () => void;
  onDownload?: (format: "markdown" | "text" | "pdf") => void;
  onDelete?: () => void;
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
  centered = false,
  onToggleCentered,
  onDownload,
  onDelete,
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
        ? "Public link is active."
        : "Enable a public link.";
  const canCopyPublicLink = Boolean(
    hasFile && sharingState?.isPublic && sharingState.shareUrl && onCopyPublicLink && !sharingState.updating,
  );
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const iconButtonClass = cn(
    "size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40",
    { "opacity-50 pointer-events-none": aiBusy }
  );

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
          {segments.length > 0 ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="block md:hidden truncate font-medium text-foreground" title={fileName}>
                {fileName}
              </span>

              {useCompactMode ? (
                <span className="hidden md:block truncate font-medium text-foreground" title={fileName}>
                  {fileName}
                </span>
              ) : (
                <div className="hidden md:flex items-center gap-0.5 whitespace-nowrap">
                  <div className="flex items-center gap-0.5 text-sm overflow-hidden mask-fade-right">
                    {segments.map((segment, index) => {
                      const isLast = index === segments.length - 1;
                      return (
                        <div key={`${segment.label}-${index}`} className="flex items-center gap-0.5 shrink-0">
                          {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                          {segment.path ? (
                            <Link
                              href={`/files/${encodePath(segment.path)}`}
                              className="flex items-center gap-1.5 hover:text-foreground text-muted-foreground transition-colors group"
                            >
                              {index === 0 && <LinkIcon className="h-3 w-3 opacity-0 -ml-3 transition-all group-hover:opacity-100 group-hover:ml-0" />}
                              <span>{segment.label}</span>
                            </Link>
                          ) : (
                            <span className={cn("shrink-0", isLast ? "font-medium text-foreground" : "text-muted-foreground")}>
                              {segment.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center">
              <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
              <span className="text-sm text-muted-foreground font-medium pl-1">Select a file</span>
            </div>
          )}
        </div>
        <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
          {/* Desktop: Expand, Edit/Preview, Save icons */}
          {hasFile && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(iconButtonClass, "hidden lg:inline-flex")}
                    onClick={onToggleCentered}
                    disabled={!onToggleCentered}
                    aria-label={centered ? "Expand content width" : "Center and narrow content"}
                  >
                    {centered ? <Maximize className="h-3.5 w-3.5" /> : <Minimize className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {centered ? "Expand content width" : "Center and narrow content"}
                </TooltipContent>
              </Tooltip>
              {/* Desktop: Edit/Preview toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(iconButtonClass, "hidden md:inline-flex")}
                    onClick={onToggleMode}
                    aria-label={mode === "preview" ? "Switch to edit mode" : "Switch to preview mode"}
                  >
                    {mode === "preview" ? <FilePenLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {mode === "preview" ? "Edit" : "Preview"}
                </TooltipContent>
              </Tooltip>
              {/* Desktop: Save icon - shown when there are unsaved changes (any mode) */}
              {canSave && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(iconButtonClass, "hidden md:inline-flex")}
                      onClick={onSave}
                      aria-label="Save changes"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Save</TooltipContent>
                </Tooltip>
              )}
              <div className="hidden md:block h-4 w-px bg-border mx-1" aria-hidden="true" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(iconButtonClass, "hidden md:inline-flex")}
                    onClick={() => setShortcutsOpen(true)}
                    aria-label="Keyboard shortcuts"
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Keyboard shortcuts</TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Dropdown menu - all actions on mobile, fewer on desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={iconButtonClass}
                aria-label="Actions menu"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {hasFile && (
                <>
                  {/* Mobile only: Edit/Preview and Save */}
                  <DropdownMenuItem
                    className="flex md:hidden items-center gap-2"
                    onClick={onToggleMode}
                  >
                    {mode === "preview" ? (
                      <FilePenLine className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="text-sm">{mode === "preview" ? "Edit" : "Preview"}</span>
                    <Kbd className="ml-auto">E</Kbd>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex md:hidden items-center gap-2"
                    onClick={onSave}
                    disabled={!canSave}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="text-sm">Save</span>
                    <Kbd className="ml-auto">⌘S</Kbd>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="md:hidden" />

                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => onDownload?.("markdown")}
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Export</span>
                    <Kbd className="ml-auto">⌘⇧E</Kbd>
                  </DropdownMenuItem>
                  {canCopyPublicLink && (
                    <DropdownMenuItem
                      className="flex items-center gap-2"
                      onClick={onCopyPublicLink}
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span className="text-sm">Copy link</span>
                      <Kbd className="ml-auto">⌘⇧C</Kbd>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <div
                    className={cn(
                      "flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer",
                      shareButtonDisabled && "opacity-50 pointer-events-none"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!shareButtonDisabled && sharingState) {
                        onTogglePublic?.();
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">Public</span>
                    </div>
                    <Switch
                      checked={sharingState?.isPublic ?? false}
                      onCheckedChange={() => {
                        if (!shareButtonDisabled && sharingState) {
                          onTogglePublic?.();
                        }
                      }}
                      disabled={shareButtonDisabled}
                      className="scale-75"
                    />
                  </div>

                  <DropdownMenuSeparator />

                  {AI_ACTIONS.map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      className="flex items-center gap-2"
                      onSelect={() => onTriggerAction(item.value)}
                      disabled={aiDisabled || aiBusy}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={onToggleRight}
                    disabled={!onToggleRight}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">Chat</span>
                    <Kbd className="ml-auto">⌘J</Kbd>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="flex items-center gap-2 rounded-md bg-destructive/80 text-destructive-foreground transition-colors hover:bg-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground"
                    onClick={onDelete}
                    disabled={!onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">Delete</span>
                    <Kbd className="ml-auto">⌘⌫</Kbd>
                  </DropdownMenuItem>
                </>
              )}

              {!hasFile && (
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={onToggleRight}
                  disabled={!onToggleRight}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">Chat</span>
                  <Kbd className="ml-auto">⌘J</Kbd>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </div>
      </div>
    </TooltipProvider>
  );
}
