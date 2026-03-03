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

type RightDesktopSidebarProps = {
  rightSidebarWidthClass: string;
  rightSidebarOpen: boolean;
  rightSidebarExpanded: boolean;
  rightSidebarTitle: string;
  rightSidebarPanel: string;
  showNewChatAction: boolean;
  onNewChat?: () => void;
  onToggleRightExpansion: () => void;
  onCloseRightSidebar: () => void;
  renderedRight: ReactNode;
  rightSidebarWidthRem: number;
  iconButtonClassName: string;
};

export function RightDesktopSidebar({
  rightSidebarWidthClass,
  rightSidebarOpen,
  rightSidebarExpanded,
  rightSidebarTitle,
  rightSidebarPanel,
  showNewChatAction,
  onNewChat,
  onToggleRightExpansion,
  onCloseRightSidebar,
  renderedRight,
  rightSidebarWidthRem,
  iconButtonClassName,
}: RightDesktopSidebarProps) {
  return (
    <div
      className={cn(
        "hidden lg:block overflow-hidden transition-[width] duration-300 ease-in-out border-l border-solid border-border/40 relative",
        rightSidebarWidthClass,
      )}
      aria-hidden={!rightSidebarOpen}
    >
      <div
        className="absolute right-0 top-0 bottom-0 transition-[width] duration-300 ease-in-out"
        style={{ width: rightSidebarExpanded ? "50vw" : `${rightSidebarWidthRem}rem` } as CSSProperties}
      >
        <Sidebar
          side="right"
          collapsible="none"
          className="h-svh w-full"
          style={{ "--sidebar-width": rightSidebarExpanded ? "50vw" : `${rightSidebarWidthRem}rem` } as CSSProperties}
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
      </div>
    </div>
  );
}
