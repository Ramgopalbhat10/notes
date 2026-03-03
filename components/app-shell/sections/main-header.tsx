import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { PanelRight } from "lucide-react";

type MainHeaderProps = {
  header?: React.ReactNode;
  leftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  leftMobileOpen: boolean;
  setLeftMobileOpen: (open: boolean) => void;
  iconButtonClassName: string;
};

export function MainHeader({
  header,
  leftSidebarOpen,
  toggleLeftSidebar,
  leftMobileOpen,
  setLeftMobileOpen,
  iconButtonClassName,
}: MainHeaderProps) {
  const { isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-10 md:h-11 items-center gap-1 md:gap-1.5 px-3 md:px-4 border-b border-border/40">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-7",
            iconButtonClassName,
            isMobile ? "inline-flex" : leftSidebarOpen ? "hidden" : "inline-flex",
          )}
          onClick={() => {
            if (isMobile) {
              setLeftMobileOpen(!leftMobileOpen);
            } else {
              toggleLeftSidebar();
            }
          }}
          aria-label="Toggle sidebar"
        >
          <PanelRight className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-0.5">{header}</div>
        </div>
      </div>
    </header>
  );
}
