"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { cn } from "../lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Maximize2, Minimize2, X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type AppShellChildren = React.ReactNode | ((helpers: { toggleRight: () => void }) => React.ReactNode);

type AppShellProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: AppShellChildren;
  header?: React.ReactNode;
};

export function AppShell({ left, right, children, header }: AppShellProps) {
  const RIGHT_SIDEBAR_WIDTH_REM = 30;
  const LEFT_SIDEBAR_WIDTH_REM = 17.5;
  const REM_IN_PX = 16;
  const MIN_MAIN_CONTENT_RATIO = 0.45;

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

  const rightSidebarWidthClass = !rightDesktopOpen
    ? "w-0 border-transparent"
    : rightExpanded
      ? "w-1/2 border-border"
      : "w-[30rem] border-border";

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
              "lg:hidden p-0 transition-[width,max-width] duration-300 ease-in-out [&>button]:hidden w-full max-w-full",
              rightMobileExpanded ? "md:w-full md:max-w-full" : "md:w-1/2 md:max-w-md"
            )}
            style={{ "--sidebar-width": rightMobileExpanded ? "100vw" : "auto" } as CSSProperties}
          >
            <SheetHeader className="px-3 py-2.5 md:px-4 md:py-3 border-b border-dashed">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-sm md:text-base">Chat</SheetTitle>
                <div className="flex items-center gap-1">
                  {/* Expand button - only on tablet (md) and above */}
                  <button
                    className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                    onClick={toggleRightMobileExpansion}
                    aria-label={rightMobileExpanded ? "Shrink chat panel" : "Expand chat panel"}
                  >
                    {rightMobileExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  {/* Close button - always visible */}
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                    onClick={() => setRightMobileOpen(false)}
                    aria-label="Close chat panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-3rem)] md:h-[calc(100vh-3.5rem)]">
              <div className="p-3 md:p-4">{right}</div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : null}

      {/* Left sidebar using shadcn primitives */}
      <Sidebar side="left" variant="sidebar" className="max-h-svh">
        <SidebarHeader className="h-12 md:h-14 shrink-0 border-b border-dashed">
          <div className="flex h-full items-center justify-between px-2.5 md:px-3">
            <div className="font-semibold text-sm md:text-base h-7 flex items-center uppercase tracking-wide">
              Vault
            </div>
            <SidebarTrigger className="size-7" />
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 md:p-4">{left}</div>
          </ScrollArea>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      {/* Main content inset */}
      <SidebarInset className="flex min-h-svh min-w-0 flex-col">
        <MainHeader header={header} />
        <div className="flex-1 min-h-0 w-full overflow-auto">
          <div className="space-y-3 p-3 sm:space-y-4 sm:p-4 pb-16 min-w-0">{renderedChildren}</div>
        </div>
      </SidebarInset>

      {/* Right sidebar container with smooth width animation (desktop only) */}
      {hasRight ? (
        <div
          className={cn(
            "hidden lg:block overflow-hidden transition-[width] duration-300 ease-in-out border-l border-dashed relative",
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
            <SidebarHeader className="h-12 md:h-14 border-b border-dashed">
              <div className="flex h-full items-center justify-between px-2.5 md:px-3">
                <div className="font-semibold text-sm md:text-base h-7 flex items-center uppercase tracking-wide">Chat</div>
                <div className="flex items-center gap-1">
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                    onClick={toggleRightExpansion}
                    aria-label={rightExpanded ? "Shrink details panel" : "Expand details panel"}
                    disabled={!rightDesktopOpen}
                  >
                    {rightExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                    onClick={() => {
                      setRightDesktopOpen(false);
                      setRightExpanded(false);
                    }}
                    aria-label="Collapse right sidebar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="min-h-0">
              <ScrollArea className="h-full">
                <div className="p-3 md:p-4">{right}</div>
              </ScrollArea>
            </SidebarContent>
          </Sidebar>
          </div>
        </div>
      ) : null}
    </SidebarProvider>
  );
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
      <div className="flex h-12 md:h-14 items-center gap-1.5 md:gap-2 px-3 md:px-4 border-b border-dashed">
        {/* Show left toggle in main: always on mobile; on md+ only when sidebar is closed */}
        <SidebarTrigger className={cn("size-7 inline-flex", open ? "md:hidden" : "md:inline-flex")} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">{header}</div>
        </div>
      </div>
    </header>
  );
}
