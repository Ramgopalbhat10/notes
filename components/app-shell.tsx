"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp, Clock3, Loader2, LogOut, Maximize2, Minimize2, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useEditorStore } from "@/stores/editor";

const FOOTER_HEIGHT_CLASS = "h-10 md:h-11";
const FOOTER_SURFACE_CLASS =
  "border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60";
const ICON_BUTTON_BASE =
  "inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40";

type AppShellChildren = React.ReactNode | ((helpers: { toggleRight: () => void }) => React.ReactNode);

type AppShellProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: AppShellChildren;
  header?: React.ReactNode;
  rightFooter?: React.ReactNode | null;
};

export function AppShell({ left, right, children, header, rightFooter }: AppShellProps) {
  const RIGHT_SIDEBAR_WIDTH_REM = 30;
  const LEFT_SIDEBAR_WIDTH_REM = 17.5;
  const REM_IN_PX = 16;
  const MIN_MAIN_CONTENT_RATIO = 0.45;
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [isMainScrollable, setIsMainScrollable] = useState(false);

  // Right column visibility (desktop/mobile)
  const [rightDesktopOpen, setRightDesktopOpen] = useState(false);
  const [rightMobileOpen, setRightMobileOpen] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const [rightMobileExpanded, setRightMobileExpanded] = useState(false);
  const hasRight = Boolean(right);

  // Close overlays on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRightMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleRight = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setRightDesktopOpen((v) => {
        const next = !v;
        if (!next) {
          setRightExpanded(false);
        }
        return next;
      });
    } else {
      setRightMobileOpen((v) => !v);
    }
  }, []);

  const toggleRightExpansion = useCallback(() => {
    setRightExpanded((value) => !value);
  }, []);

  const toggleRightMobileExpansion = useCallback(() => {
    setRightMobileExpanded((value) => !value);
  }, []);

  const renderedChildren = typeof children === "function" ? children({ toggleRight }) : children;
  const editorStatus = useEditorStore((state) => state.status);
  const dirty = useEditorStore((state) => state.dirty);
  const lastSavedAt = useEditorStore((state) => state.lastSavedAt);
  const error = useEditorStore((state) => state.error);
  const conflictMessage = useEditorStore((state) => state.conflictMessage);
  const errorSource = useEditorStore((state) => state.errorSource);
  const fileKey = useEditorStore((state) => state.fileKey);
  const content = useEditorStore((state) => state.content);
  const save = useEditorStore((state) => state.save);
  const loadFile = useEditorStore((state) => state.loadFile);
  const hasFile = Boolean(fileKey);
  const totalReadTime = useMemo(() => computeReadingTimeLabel(content, hasFile), [content, hasFile]);
  const statusDescriptor = useMemo(
    () => buildStatusDescriptor({ status: editorStatus, dirty, lastSavedAt, error, conflictMessage, errorSource, hasFile }),
    [editorStatus, dirty, lastSavedAt, error, conflictMessage, errorSource, hasFile],
  );
  const canRetrySave = hasFile && editorStatus === "error" && errorSource === "save";
  const canReloadRemote = hasFile && editorStatus === "conflict";
  const handleRetrySave = useCallback(() => {
    void save("manual");
  }, [save]);
  const handleReloadRemote = useCallback(() => {
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
  }, [dirty, fileKey, loadFile]);
  const scrollMainToTop = useCallback(() => {
    const el = mainScrollRef.current;
    if (!el) {
      return;
    }
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const rightSidebarWidthClass = !rightDesktopOpen
    ? "w-0 border-transparent"
    : rightExpanded
      ? "w-1/2 border-border"
      : "w-[30rem] border-border";
  const updateMainScrollMetrics = useCallback(() => {
    const el = mainScrollRef.current;
    if (!el) {
      return;
    }
    const scrollable = el.scrollHeight - el.clientHeight > 8;
    setIsMainScrollable(scrollable);
  }, []);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) {
      return;
    }
    updateMainScrollMetrics();
    const handleScroll = () => updateMainScrollMetrics();
    el.addEventListener("scroll", handleScroll);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateMainScrollMetrics()) : null;
    if (resizeObserver) {
      resizeObserver.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateMainScrollMetrics]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const id = window.requestAnimationFrame(() => updateMainScrollMetrics());
    return () => window.cancelAnimationFrame(id);
  }, [renderedChildren, updateMainScrollMetrics]);

  return (
    <SidebarProvider
      className="bg-background text-foreground h-svh w-full"
      style={{ "--sidebar-width": `${LEFT_SIDEBAR_WIDTH_REM}rem` } as CSSProperties}
    >
      <SidebarAutoCollapse
        leftWidthPx={LEFT_SIDEBAR_WIDTH_REM * REM_IN_PX}
        rightWidthPx={RIGHT_SIDEBAR_WIDTH_REM * REM_IN_PX}
        minMainRatio={MIN_MAIN_CONTENT_RATIO}
        rightDesktopOpen={rightDesktopOpen}
        rightExpanded={rightExpanded}
      />
      {/* Right mobile sheet (left is handled by Sidebar internally) */}
      {hasRight ? (
        <Sheet open={rightMobileOpen} onOpenChange={(open) => {
          setRightMobileOpen(open);
          if (!open) {
            setRightMobileExpanded(false);
          }
        }}>
          <SheetContent
            side="right"
            className={cn(
              "lg:hidden p-0 transition-[width,max-width] duration-300 ease-in-out [&>button]:hidden w-full max-w-full flex flex-col",
              rightMobileExpanded ? "md:w-full md:max-w-full" : "md:w-1/2 md:max-w-md"
            )}
            style={{ "--sidebar-width": rightMobileExpanded ? "100vw" : "auto" } as CSSProperties}
          >
            <SheetHeader className="px-3 py-2 md:px-4 md:py-2 border-b border-border/40">
              <div className="flex items-center justify-between">
                <SheetTitle className="font-semibold text-sm md:text-base uppercase ml-1">Chat</SheetTitle>
                <div className="flex items-center gap-0.5">
                  {/* Expand button - only on tablet (md) and above */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("hidden md:inline-flex size-7", ICON_BUTTON_BASE)}
                    onClick={toggleRightMobileExpansion}
                    aria-label={rightMobileExpanded ? "Shrink chat panel" : "Expand chat panel"}
                  >
                    {rightMobileExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  {/* Close button - always visible */}
                  <Button
                    variant="ghost"
                    className={cn("inline-flex size-7", ICON_BUTTON_BASE)}
                    onClick={() => setRightMobileOpen(false)}
                    aria-label="Close chat panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden md:p-4">
                <div className="h-full">
                  {right}
                </div>
              </div>
              <RightSidebarFooter content={rightFooter} />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      {/* Left sidebar using shadcn primitives */}
      <Sidebar side="left" variant="sidebar" className="max-h-svh border-r border-solid border-border/40">
        <SidebarHeader className="h-10 md:h-11 shrink-0 border-b border-solid border-border/40">
          <div className="flex h-full items-center justify-between px-2.5 md:px-3">
            <div className="font-semibold text-sm md:text-base h-7 flex items-center uppercase tracking-wide">
              Vault
            </div>
            <SidebarTrigger className={cn("size-7", ICON_BUTTON_BASE)} />
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 min-h-0">
          <div className="p-3 md:p-4">{left}</div>
        </SidebarContent>
        <SidebarFooter className="mt-auto p-0 sticky bottom-0">
          <LeftSidebarFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Main content inset */}
      <SidebarInset className="flex min-h-svh min-w-0 flex-col">
        <MainHeader header={header} />
        <div ref={mainScrollRef} className="flex-1 min-h-0 w-full overflow-auto">
          <div className="space-y-3 sm:space-y-4 sm:px-8 sm:py-4 pt-0 min-w-0">{renderedChildren}</div>
        </div>
        <MainFooter
          descriptor={statusDescriptor}
          canRetry={canRetrySave}
          canReload={canReloadRemote}
          onRetry={canRetrySave ? handleRetrySave : undefined}
          onReload={canReloadRemote ? handleReloadRemote : undefined}
          totalReadTime={totalReadTime}
          canScrollTop={isMainScrollable}
          onScrollTop={scrollMainToTop}
        />
      </SidebarInset>

      {/* Right sidebar container with smooth width animation (desktop only) */}
      {hasRight ? (
        <div
          className={cn(
            "hidden lg:block overflow-hidden transition-[width] duration-300 ease-in-out border-l border-solid border-border/40 relative",
            rightSidebarWidthClass,
          )}
          aria-hidden={!rightDesktopOpen}
        >
          <div className="absolute right-0 top-0 bottom-0 transition-[width] duration-300 ease-in-out" style={{
            width: rightExpanded ? "50vw" : `${RIGHT_SIDEBAR_WIDTH_REM}rem`,
          } as CSSProperties}>
            <Sidebar
              side="right"
              collapsible="none"
              className="h-svh w-full"
              style={{
                "--sidebar-width": rightExpanded ? "50vw" : `${RIGHT_SIDEBAR_WIDTH_REM}rem`,
              } as CSSProperties}
            >
            <SidebarHeader className="h-10 md:h-11 border-b border-solid border-border/40">
              <div className="flex h-full items-center justify-between px-2.5 md:px-3">
                <div className="font-semibold text-sm md:text-base h-7 flex items-center uppercase tracking-wide">Chat</div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("inline-flex size-7", ICON_BUTTON_BASE)}
                    onClick={toggleRightExpansion}
                    aria-label={rightExpanded ? "Shrink details panel" : "Expand details panel"}
                    disabled={!rightDesktopOpen}
                  >
                    {rightExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("inline-flex size-7", ICON_BUTTON_BASE)}
                    onClick={() => {
                      setRightDesktopOpen(false);
                      setRightExpanded(false);
                    }}
                    aria-label="Collapse right sidebar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="min-h-0 overflow-hidden gap-0">
              <div className="flex-1 min-h-0 overflow-hidden pl-3 md:py-4">
                <div className="h-full">
                  {right}
                </div>
              </div>
            </SidebarContent>
            <SidebarFooter className="mt-auto p-0 sticky bottom-0">
              <RightSidebarFooter content={rightFooter} />
            </SidebarFooter>
          </Sidebar>
          </div>
        </div>
      ) : null}
    </SidebarProvider>
  );
}

function LeftSidebarFooter() {
  const router = useRouter();
  const sessionState = authClient.useSession();
  const user = sessionState.data?.user;
  const [signingOut, setSigningOut] = useState(false);

  const displayName = user?.name || user?.email || "";
  const avatarImage = user?.image ?? undefined;
  const avatarFallback = (displayName || "?").slice(0, 1).toUpperCase();

  const handleSignOut = useCallback(async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/auth/sign-in");
          },
        },
      });
    } catch (error) {
      console.error("Failed to sign out", error);
      setSigningOut(false);
    }
  }, [router, signingOut]);

  return (
    <div className={cn(FOOTER_SURFACE_CLASS, FOOTER_HEIGHT_CLASS, "flex w-full items-center justify-between px-3 md:px-4")}>
      <Avatar className="h-9 w-9">
        {avatarImage ? <AvatarImage src={avatarImage} alt={displayName || "Profile"} /> : null}
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-7", ICON_BUTTON_BASE)}
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Sign out"
      >
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      </Button>
    </div>
  );
}

type StatusDescriptor = {
  message: string;
  tone: "idle" | "info" | "warning" | "error";
  showLoader?: boolean;
};

type MainFooterProps = {
  descriptor: StatusDescriptor | null;
  canRetry: boolean;
  canReload: boolean;
  onRetry?: () => void;
  onReload?: () => void;
  totalReadTime: string;
  canScrollTop: boolean;
  onScrollTop: () => void;
};

function MainFooter({
  descriptor,
  canRetry,
  canReload,
  onRetry,
  onReload,
  totalReadTime,
  canScrollTop,
  onScrollTop,
}: MainFooterProps) {
  const toneClass = descriptor
    ? {
        idle: "text-muted-foreground",
        info: "text-foreground",
        warning: "text-amber-500",
        error: "text-destructive",
      }[descriptor.tone]
    : "text-muted-foreground";

  return (
    <div className={cn(FOOTER_SURFACE_CLASS, FOOTER_HEIGHT_CLASS, "flex items-center justify-between px-3 md:px-4 text-xs md:text-sm")}>
      <div className="flex items-center gap-1.5 min-w-0">
        {descriptor?.showLoader ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        <span className={cn("truncate", toneClass)}>
          {descriptor?.message ?? "Select a note to see save status"}
        </span>
        {canRetry && onRetry ? (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        {canReload && onReload ? (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onReload}>
            Reload
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Clock3 className="h-4 w-4" />
          <span className="text-xs md:text-sm">{totalReadTime}</span>
        </div>
        {canScrollTop ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("size-7", ICON_BUTTON_BASE)}
                onClick={onScrollTop}
                aria-label="Scroll to top"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Scroll to top</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

function RightSidebarFooter({ content }: { content?: React.ReactNode | null }) {
  return (
    <div className={cn(FOOTER_SURFACE_CLASS, FOOTER_HEIGHT_CLASS, "flex w-full items-center px-3 md:px-4")}>
      {content ? content : <span className="text-xs text-muted-foreground">Chat unavailable</span>}
    </div>
  );
}

type StatusDescriptorInput = {
  status: string;
  dirty: boolean;
  lastSavedAt: string | null;
  error: string | null;
  conflictMessage: string | null;
  errorSource: "load" | "save" | null;
  hasFile: boolean;
};

function buildStatusDescriptor({
  status,
  dirty,
  lastSavedAt,
  error,
  conflictMessage,
  errorSource,
  hasFile,
}: StatusDescriptorInput): StatusDescriptor | null {
  if (!hasFile) {
    return { message: "Select a file to begin", tone: "idle" };
  }

  if (status === "loading") {
    return { message: "Loading…", tone: "info", showLoader: true };
  }

  if (status === "saving") {
    return { message: "Saving…", tone: "info", showLoader: true };
  }

  if (status === "error") {
    const prefix = errorSource === "load" ? "Failed to load" : "Failed to save";
    const detail = error ? `: ${error}` : "";
    return { message: `${prefix}${detail}`, tone: "error" };
  }

  if (status === "conflict") {
    const detail = conflictMessage ? `: ${conflictMessage}` : "";
    return { message: `Save blocked by remote changes${detail}`, tone: "error" };
  }

  if (dirty) {
    return { message: "Unsaved changes", tone: "warning" };
  }

  const formatted = lastSavedAt ? formatTimestamp(lastSavedAt) : null;
  return { message: formatted ? `Saved • ${formatted}` : "Saved", tone: "idle" };
}

function computeReadingTimeLabel(content: string, hasFile: boolean): string {
  if (!hasFile) {
    return "—";
  }
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (!words) {
    return "< 1 min";
  }
  const minutes = words / 200;
  if (minutes < 1) {
    return "< 1 min";
  }
  if (minutes < 60) {
    return `${Math.max(1, Math.round(minutes))} min`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1)} hr`;
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

function SidebarAutoCollapse({
  leftWidthPx,
  rightWidthPx,
  minMainRatio,
  rightDesktopOpen,
  rightExpanded,
}: {
  leftWidthPx: number;
  rightWidthPx: number;
  minMainRatio: number;
  rightDesktopOpen: boolean;
  rightExpanded: boolean;
}) {
  const { open, setOpen } = useSidebar();

  useEffect(() => {
    if (!rightDesktopOpen) {
      return;
    }

    const evaluate = () => {
      if (typeof window === "undefined") {
        return;
      }
      const viewportWidth = window.innerWidth;
      if (!viewportWidth) {
        return;
      }

      const leftWidth = open ? leftWidthPx : 0;
      const effectiveRightWidth = rightExpanded ? viewportWidth * 0.5 : rightWidthPx;
      const mainWidth = viewportWidth - leftWidth - effectiveRightWidth;
      if (open && mainWidth / viewportWidth < minMainRatio) {
        setOpen(false);
      }
    };

    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, [leftWidthPx, minMainRatio, open, rightDesktopOpen, rightExpanded, rightWidthPx, setOpen]);

  return null;
}

function MainHeader({ header }: { header?: React.ReactNode }) {
  const { open } = useSidebar();
  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-10 md:h-11 items-center gap-1 md:gap-1.5 px-3 md:px-4 border-b border-border/40">
        {/* Show left toggle in main: always on mobile; on md+ only when sidebar is closed */}
        <SidebarTrigger
          className={cn(
            "size-7",
            ICON_BUTTON_BASE,
            open ? "md:hidden" : "md:inline-flex",
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-0.5">{header}</div>
        </div>
      </div>
    </header>
  );
}
