import type { CSSProperties, ReactNode } from "react";

import { Maximize2, Minimize2, PanelLeft, PanelRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type LeftDesktopSidebarProps = {
  leftSidebarOpen: boolean;
  leftSidebarExpanded: boolean;
  leftSidebarWidthValue: string;
  onToggleLeftSidebarExpansion: () => void;
  onToggleLeftSidebar: () => void;
  left: ReactNode;
  footer: ReactNode;
  iconButtonClassName: string;
};

export function LeftDesktopSidebar({
  leftSidebarOpen,
  leftSidebarExpanded,
  leftSidebarWidthValue,
  onToggleLeftSidebarExpansion,
  onToggleLeftSidebar,
  left,
  footer,
  iconButtonClassName,
}: LeftDesktopSidebarProps) {
  return (
    <div
      className={cn(
        "hidden md:block overflow-hidden transition-[width] duration-300 ease-in-out border-r border-solid border-border/40 relative",
        !leftSidebarOpen && "w-0 border-transparent",
      )}
      style={{
        width: leftSidebarOpen ? leftSidebarWidthValue : 0,
      } as CSSProperties}
      aria-hidden={!leftSidebarOpen}
    >
      <div
        className="absolute left-0 top-0 bottom-0 transition-[width] duration-300 ease-in-out"
        style={{ width: leftSidebarWidthValue } as CSSProperties}
      >
        <Sidebar
          side="left"
          collapsible="none"
          className="h-svh w-full"
          style={{ "--sidebar-width": leftSidebarWidthValue } as CSSProperties}
        >
          <SidebarHeader className="h-10 md:h-11 shrink-0 border-b border-solid border-border/40">
            <div className="flex h-full items-center justify-between px-2.5 md:px-3">
              <div className="font-semibold text-sm md:text-base h-7 flex items-center uppercase tracking-wide">
                Vault
              </div>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(iconButtonClassName, "inline-flex size-7")}
                      onClick={onToggleLeftSidebarExpansion}
                      aria-label={leftSidebarExpanded ? "Shrink sidebar" : "Expand sidebar"}
                    >
                      {leftSidebarExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {leftSidebarExpanded ? "Shrink sidebar" : "Expand sidebar"}
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("inline-flex size-7 relative", iconButtonClassName)}
                  onClick={onToggleLeftSidebar}
                  aria-label="Close sidebar"
                >
                  <PanelRight
                    className="h-4 w-4 absolute inset-0 m-auto transition-all duration-200 opacity-0 scale-0 rotate-90"
                    aria-hidden={true}
                  />
                  <PanelLeft
                    className="h-4 w-4 absolute inset-0 m-auto transition-all duration-200 opacity-100 scale-100 rotate-0"
                    aria-hidden={false}
                  />
                </Button>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-1 min-h-0">
            <div className="p-3 md:p-4">{left}</div>
          </SidebarContent>
          <SidebarFooter className="mt-auto p-0 sticky bottom-0">{footer}</SidebarFooter>
        </Sidebar>
      </div>
    </div>
  );
}
