"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelRight, Plus, X } from "lucide-react";
import { useWorkspaceLayoutStore, type RightSidebarPanel } from "@/stores/layout";
import { useAppShellShortcuts } from "@/components/app-shell/hooks/use-app-shell-shortcuts";
import { useLeftSidebarLayout } from "@/components/app-shell/hooks/use-left-sidebar-layout";
import { useMainScroll } from "@/components/app-shell/hooks/use-main-scroll";
import { useRightMobileSheet } from "@/components/app-shell/hooks/use-right-mobile-sheet";
import { useRightSidebarPanel } from "@/components/app-shell/hooks/use-right-sidebar-panel";
import { LeftDesktopSidebar } from "@/components/app-shell/sections/left-desktop-sidebar";
import { LeftSidebarFooter } from "@/components/app-shell/sections/left-sidebar-footer";
import { MainFooter } from "@/components/app-shell/sections/main-footer";
import { MainHeader } from "@/components/app-shell/sections/main-header";
import { QuickSwitcher } from "@/components/quick-switcher";
import { RightDesktopSidebar } from "@/components/app-shell/sections/right-desktop-sidebar";
import { SidebarAutoCollapse } from "@/components/app-shell/sections/sidebar-auto-collapse";
import { buildStatusDescriptor, computeReadingTimeLabel } from "@/components/app-shell/status-utils";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useEditorStore } from "@/stores/editor";
import type { NodeId } from "@/stores/tree";

const FOOTER_HEIGHT_CLASS = "h-10 md:h-11";
const FOOTER_SURFACE_CLASS =
  "border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60";
const ICON_BUTTON_BASE =
  "inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/40";

type AppShellChildren = React.ReactNode | ((helpers: {
  toggleRight: () => void;
  openRightPanel: (panel: RightSidebarPanel) => void;
  openChatSidebar: () => void;
  openOutlineSidebar: () => void;
  openAssistantSidebar: () => void;
  openQuickSwitcher: () => void;
}) => React.ReactNode);

type AppShellProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: AppShellChildren;
  header?: React.ReactNode;
  onNewChat?: () => void;
  onQuickCreateFile?: (parentId: NodeId | null) => void;
  onQuickCreateFolder?: (parentId: NodeId | null) => void;
};

export function AppShell({
  left,
  right,
  children,
  header,
  onNewChat,
  onQuickCreateFile,
  onQuickCreateFolder,
}: AppShellProps) {
  const RIGHT_SIDEBAR_WIDTH_REM = 30;
  const LEFT_SIDEBAR_WIDTH_REM = 17.5;
  const LEFT_SIDEBAR_EXPANDED_REM = 28; // ~448px expanded width
  const REM_IN_PX = 16;
  const MIN_MAIN_CONTENT_RATIO = 0.45;

  // Right sidebar state from global store (persists across route changes)
  const rightSidebarOpen = useWorkspaceLayoutStore((state) => state.rightSidebarOpen);
  const rightSidebarExpanded = useWorkspaceLayoutStore((state) => state.rightSidebarExpanded);
  const rightSidebarPanel = useWorkspaceLayoutStore((state) => state.rightSidebarPanel);
  const setRightSidebarOpen = useWorkspaceLayoutStore((state) => state.setRightSidebarOpen);
  const setRightSidebarExpanded = useWorkspaceLayoutStore((state) => state.setRightSidebarExpanded);
  const setRightSidebarPanel = useWorkspaceLayoutStore((state) => state.setRightSidebarPanel);
  const openRightSidebar = useWorkspaceLayoutStore((state) => state.openRightSidebar);
  const toggleRightSidebar = useWorkspaceLayoutStore((state) => state.toggleRightSidebar);
  const toggleRightSidebarExpansion = useWorkspaceLayoutStore((state) => state.toggleRightSidebarExpansion);

  // Left sidebar state from global store (persists across route changes)
  const leftSidebarOpen = useWorkspaceLayoutStore((state) => state.leftSidebarOpen);
  const leftSidebarExpanded = useWorkspaceLayoutStore((state) => state.leftSidebarExpanded);
  const setLeftSidebarOpen = useWorkspaceLayoutStore((state) => state.setLeftSidebarOpen);
  const toggleLeftSidebar = useWorkspaceLayoutStore((state) => state.toggleLeftSidebar);
  const toggleLeftSidebarExpansion = useWorkspaceLayoutStore((state) => state.toggleLeftSidebarExpansion);
  const { isMobile, leftSidebarWidthValue, leftSidebarWidthPx } = useLeftSidebarLayout({
    leftSidebarExpanded,
    leftSidebarWidthRem: LEFT_SIDEBAR_WIDTH_REM,
    leftSidebarExpandedRem: LEFT_SIDEBAR_EXPANDED_REM,
    remInPx: REM_IN_PX,
  });

  // Mobile-specific state (doesn't need to persist)
  const [leftMobileOpen, setLeftMobileOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const hasRight = Boolean(right);

  const {
    rightMobileOpen,
    setRightMobileOpen,
    handleRightMobileOpenChange,
    toggleRight,
    openRightPanel,
    openChatSidebar,
    openOutlineSidebar,
    openAssistantSidebar,
    handleOutlineNavigateOnMobile,
  } = useRightMobileSheet({
    hasRight,
    rightSidebarPanel,
    setRightSidebarPanel,
    openRightSidebar,
    toggleRightSidebar,
  });

  useAppShellShortcuts({
    hasRight,
    quickSwitcherOpen,
    rightMobileOpen,
    rightSidebarPanel,
    setQuickSwitcherOpen,
    setRightSidebarPanel,
    setRightMobileOpen,
    toggleRightSidebar,
  });

  const toggleRightExpansion = useCallback(() => {
    toggleRightSidebarExpansion();
  }, [toggleRightSidebarExpansion]);

  const handleCloseRightSidebar = useCallback(() => {
    setRightSidebarOpen(false);
    setRightSidebarExpanded(false);
  }, [setRightSidebarOpen, setRightSidebarExpanded]);

  const openQuickSwitcher = useCallback(() => {
    setQuickSwitcherOpen(true);
  }, []);

  const renderedChildren = typeof children === "function"
    ? children({
      toggleRight,
      openRightPanel,
      openChatSidebar,
      openOutlineSidebar,
      openAssistantSidebar,
      openQuickSwitcher,
    })
    : children;
  const { mainScrollRef, isMainScrollable, scrollMainToTop } = useMainScroll({ dependency: renderedChildren });
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

  const rightSidebarWidthClass = !rightSidebarOpen
    ? "w-0 border-transparent"
    : rightSidebarExpanded
      ? "w-1/2 border-border"
      : "w-[30rem] border-border";
  const { rightSidebarTitle, showNewChatAction, renderedRight } = useRightSidebarPanel({
    right,
    rightSidebarPanel,
    onOutlineNavigateOnMobile: handleOutlineNavigateOnMobile,
  });

  return (
    <SidebarProvider
      className="bg-background text-foreground h-svh w-full"
      style={{ "--sidebar-width": leftSidebarWidthValue } as CSSProperties}
    >
      <QuickSwitcher
        open={quickSwitcherOpen}
        onOpenChange={setQuickSwitcherOpen}
        onCreateFile={(parentId) => onQuickCreateFile?.(parentId)}
        onCreateFolder={(parentId) => onQuickCreateFolder?.(parentId)}
      />
      <SidebarAutoCollapse
        leftWidthPx={leftSidebarWidthPx}
        rightWidthPx={RIGHT_SIDEBAR_WIDTH_REM * REM_IN_PX}
        minMainRatio={MIN_MAIN_CONTENT_RATIO}
        rightSidebarOpen={rightSidebarOpen}
        rightSidebarExpanded={rightSidebarExpanded}
      />
      {/* Left mobile sheet */}
      <Sheet open={leftMobileOpen} onOpenChange={setLeftMobileOpen}>
        <SheetContent
          side="left"
          className="w-auto bg-transparent shadow-none border-none p-0 [&>button]:hidden"
          style={{ "--sidebar-width": "100vw" } as CSSProperties}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Vault</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground w-[100vw] max-w-[100vw] shadow-lg">
            <div className="h-10 shrink-0 border-b border-solid border-border/40 flex items-center justify-between px-2.5">
              <div className="font-semibold text-sm h-7 flex items-center uppercase tracking-wide">
                Vault
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn("inline-flex size-7", ICON_BUTTON_BASE)}
                onClick={() => setLeftMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-3">
              {left}
            </div>
            <LeftSidebarFooter
              footerSurfaceClass={FOOTER_SURFACE_CLASS}
              footerHeightClass={FOOTER_HEIGHT_CLASS}
              iconButtonClassName={ICON_BUTTON_BASE}
            />
          </div>
        </SheetContent>
      </Sheet>
      {/* Right mobile sheet */}
      {hasRight ? (
        <Sheet open={rightMobileOpen} onOpenChange={handleRightMobileOpenChange}>
          <SheetContent
            side="right"
            className="h-[100dvh] !w-[100vw] !max-w-[100vw] bg-transparent shadow-none border-none p-0 sm:!max-w-[100vw] [&>button]:hidden"
            style={{ "--sidebar-width": "100vw" } as CSSProperties}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{rightSidebarTitle}</SheetTitle>
            </SheetHeader>
            <div className={cn(
              "flex h-[100dvh] flex-col bg-background border-l shadow-lg transition-[width,max-width] duration-300 ease-in-out will-change-[transform,width]",
              "w-[100vw] max-w-[100vw]"
            )}>
              <div className="h-10 shrink-0 border-b border-solid border-border/40 flex items-center justify-between px-2.5">
                <div className="font-semibold text-sm h-7 flex items-center uppercase tracking-wide">
                  {rightSidebarTitle}
                </div>
                <div className="flex items-center gap-1">
                  {showNewChatAction ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("inline-flex size-7", ICON_BUTTON_BASE)}
                            onClick={onNewChat}
                            aria-label="New chat"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="hidden md:block">New chat</TooltipContent>
                      </Tooltip>
                      <div className="h-4 w-px bg-border/60 mx-1.5" />
                    </>
                  ) : null}
                  {/* Close button - always visible */}
                  <Button
                    variant="ghost"
                    className={cn("inline-flex size-7", ICON_BUTTON_BASE)}
                    onClick={() => setRightMobileOpen(false)}
                    aria-label="Close right panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div
                    key={rightSidebarPanel}
                    className="h-full animate-in fade-in-0 slide-in-from-right-2 duration-200"
                  >
                    {renderedRight}
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <LeftDesktopSidebar
        leftSidebarOpen={leftSidebarOpen}
        leftSidebarExpanded={leftSidebarExpanded}
        leftSidebarWidthValue={leftSidebarWidthValue}
        onToggleLeftSidebarExpansion={toggleLeftSidebarExpansion}
        onToggleLeftSidebar={toggleLeftSidebar}
        left={left}
        footer={(
          <LeftSidebarFooter
            footerSurfaceClass={FOOTER_SURFACE_CLASS}
            footerHeightClass={FOOTER_HEIGHT_CLASS}
            iconButtonClassName={ICON_BUTTON_BASE}
          />
        )}
        iconButtonClassName={ICON_BUTTON_BASE}
      />

      {/* Main content inset */}
      <SidebarInset className="flex min-h-svh min-w-0 flex-col">
        <MainHeader
          header={header}
          leftSidebarOpen={leftSidebarOpen}
          toggleLeftSidebar={toggleLeftSidebar}
          leftMobileOpen={leftMobileOpen}
          setLeftMobileOpen={setLeftMobileOpen}
          iconButtonClassName={ICON_BUTTON_BASE}
        />
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
          footerSurfaceClass={FOOTER_SURFACE_CLASS}
          footerHeightClass={FOOTER_HEIGHT_CLASS}
          iconButtonClassName={ICON_BUTTON_BASE}
        />
      </SidebarInset>

      {hasRight ? (
        <RightDesktopSidebar
          rightSidebarWidthClass={rightSidebarWidthClass}
          rightSidebarOpen={rightSidebarOpen}
          rightSidebarExpanded={rightSidebarExpanded}
          rightSidebarTitle={rightSidebarTitle}
          rightSidebarPanel={rightSidebarPanel}
          showNewChatAction={showNewChatAction}
          onNewChat={onNewChat}
          onToggleRightExpansion={toggleRightExpansion}
          onCloseRightSidebar={handleCloseRightSidebar}
          renderedRight={renderedRight}
          rightSidebarWidthRem={RIGHT_SIDEBAR_WIDTH_REM}
          iconButtonClassName={ICON_BUTTON_BASE}
        />
      ) : null}
    </SidebarProvider >
  );
}
