import { ArrowUp, Clock3, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { StatusDescriptor } from "@/components/app-shell/status-utils";

type MainFooterProps = {
  descriptor: StatusDescriptor | null;
  canRetry: boolean;
  canReload: boolean;
  onRetry?: () => void;
  onReload?: () => void;
  totalReadTime: string;
  canScrollTop: boolean;
  onScrollTop: () => void;
  footerSurfaceClass: string;
  footerHeightClass: string;
  iconButtonClassName: string;
};

export function MainFooter({
  descriptor,
  canRetry,
  canReload,
  onRetry,
  onReload,
  totalReadTime,
  canScrollTop,
  onScrollTop,
  footerSurfaceClass,
  footerHeightClass,
  iconButtonClassName,
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
    <div
      className={cn(
        footerSurfaceClass,
        footerHeightClass,
        "flex items-center justify-between px-3 md:px-4 text-xs md:text-sm",
      )}
    >
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
                className={cn("size-7", iconButtonClassName)}
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
