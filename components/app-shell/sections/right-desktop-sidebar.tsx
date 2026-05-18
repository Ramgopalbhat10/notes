import type { CSSProperties, ReactNode } from "react";

import { Maximize2, Minimize2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRightSidebarResize } from "@/components/app-shell/hooks/use-right-sidebar-resize";

type RightDesktopSidebarProps = {
  rightSidebarOpen: boolean;
  rightSidebarExpanded: boolean;
  rightSidebarWidthPx: number;
  minRightWidthPx: number;
  maxRightWidthPx: number;
  rightSidebarTitle: string;
  rightSidebarPanel: string;
  showNewChatAction: boolean;
  onNewChat?: () => void;
  onToggleRightExpansion: () => void;
  onCloseRightSidebar: () => void;
  renderedRight: ReactNode;
  onResizeRightSidebar: (width: number) => void;
  iconButtonClassName: string;
};

export function RightDesktopSidebar({
  rightSidebarOpen,
  rightSidebarExpanded,
  rightSidebarWidthPx,
  minRightWidthPx,
  maxRightWidthPx,
  rightSidebarTitle,
  rightSidebarPanel,
  showNewChatAction,
  onNewChat,
  onToggleRightExpansion,
  onCloseRightSidebar,
  renderedRight,
  onResizeRightSidebar,
  iconButtonClassName,
}: RightDesktopSidebarProps) {
  const { isDragging, startResize, elementRef } = useRightSidebarResize({
    initialWidth: rightSidebarWidthPx,
    minWidth: minRightWidthPx,
    maxWidth: maxRightWidthPx,
    onResize: onResizeRightSidebar,
  });

  return (
    <div
      ref={elementRef}
      className={cn(
        "hidden lg:block overflow-hidden border-l relative",
        rightSidebarOpen ? "border-border/40 border-solid" : "border-transparent",
        !isDragging && rightSidebarOpen && "transition-[width] duration-300 ease-in-out",
      )}
      style={{
        width: rightSidebarOpen ? `${rightSidebarWidthPx}px` : 0,
        "--sidebar-width": rightSidebarOpen ? `${rightSidebarWidthPx}px` : undefined,
      } as CSSProperties}
      aria-hidden={!rightSidebarOpen}
    >
      <Sidebar
        side="right"
        collapsible="none"
        className="h-svh w-full"
      >
        <SidebarHeader className="h-10 md:h-11 border-b border-solid border-border/40">
          <div className="flex h-full items-center justify-between px-2.5 md:px-3">
            <div className="font-semibold text-sm md:text-base h-7 flex items-center uppercase tracking-wide">
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
                        className={cn("inline-flex size-7", iconButtonClassName)}
                        onClick={onNewChat}
                        aria-label="New chat"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">New chat</TooltipContent>
                  </Tooltip>
                  <div className="h-4 w-px bg-border/60 mx-1.5" />
                </>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className={cn("inline-flex size-7", iconButtonClassName)}
                onClick={onToggleRightExpansion}
                aria-label={rightSidebarExpanded ? "Shrink panel" : "Expand panel"}
                disabled={!rightSidebarOpen}
              >
                {rightSidebarExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("inline-flex size-7", iconButtonClassName)}
                onClick={onCloseRightSidebar}
                aria-label="Collapse right sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="min-h-0 gap-0 p-0 overflow-hidden">
          <div
            key={rightSidebarPanel}
            className="h-full animate-in fade-in-0 slide-in-from-right-2 duration-200"
          >
            {renderedRight}
          </div>
        </SidebarContent>
      </Sidebar>

      {/* Resize handle */}
      {rightSidebarOpen && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-50"
          onMouseDown={startResize}
          title="Drag to resize"
        />
      )}
    </div>
  );
}
