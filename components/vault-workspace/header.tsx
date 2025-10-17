import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, Eye, FilePenLine, Loader2, MessageSquare, Save } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth/client";

import { AiActionDropdown } from "./ai-action-dropdown";
import type { AiActionType, BreadcrumbSegment } from "./types";

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
}: WorkspaceHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [useCompactMode, setUseCompactMode] = useState(false);
  const fileName = segments[segments.length - 1]?.label ?? "";
  const router = useRouter();
  const sessionState = authClient.useSession();
  const user = sessionState.data?.user;
  const displayName = user?.name || user?.email || "";
  const avatarAlt = user?.name || user?.email || "";
  const avatarFallback = (displayName || "?").slice(0, 1).toUpperCase();

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
    <div ref={headerRef} className="flex w-full items-center gap-1">
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
              <div className="hidden md:flex items-center gap-1 whitespace-nowrap">
                {segments.map((segment, index) => {
                  const isLast = index === segments.length - 1;
                  return (
                    <div key={`${segment.label}-${index}`} className="flex items-center gap-1 shrink-0">
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
      <div className="ml-auto flex flex-shrink-0 items-center gap-1">
        {hasFile ? (
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleMode}
              aria-label={mode === "preview" ? "Switch to edit mode" : "Switch to preview mode"}
            >
              {mode === "preview" ? <FilePenLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            {mode === "edit" ? (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onSave}
                disabled={!canSave}
                aria-label="Save changes"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              </Button>
            ) : null}
          </>
        ) : null}
        <AiActionDropdown disabled={aiDisabled} busy={aiBusy} onSelect={onTriggerAction} />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleRight}
          disabled={!onToggleRight}
          aria-label="Open chat panel"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-md border px-2 h-8 hover:bg-accent">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={user.image || undefined} alt={avatarAlt} />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-xs max-w-32 truncate">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{displayName}</div>
              <div className="my-1 h-px bg-border" />
              <DropdownMenuItem
                onClick={async () => {
                  await authClient.signOut({ fetchOptions: { onSuccess: () => { router.push("/auth/sign-in"); } } });
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" onClick={() => router.push("/auth/sign-in")}>Sign in</Button>
        )}
      </div>
    </div>
  );
}
