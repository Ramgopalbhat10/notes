import { useEffect } from "react";

import { useSidebar } from "@/components/ui/sidebar";

type SidebarAutoCollapseProps = {
  leftWidthPx: number;
  rightWidthPx: number;
  minMainRatio: number;
  rightSidebarOpen: boolean;
  rightSidebarExpanded: boolean;
};

export function SidebarAutoCollapse({
  leftWidthPx,
  rightWidthPx,
  minMainRatio,
  rightSidebarOpen,
  rightSidebarExpanded,
}: SidebarAutoCollapseProps) {
  const { open, setOpen } = useSidebar();

  useEffect(() => {
    if (!rightSidebarOpen) {
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
      const effectiveRightWidth = rightSidebarExpanded ? viewportWidth * 0.5 : rightWidthPx;
      const mainWidth = viewportWidth - leftWidth - effectiveRightWidth;
      if (open && mainWidth / viewportWidth < minMainRatio) {
        setOpen(false);
      }
    };

    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, [leftWidthPx, minMainRatio, open, rightSidebarOpen, rightSidebarExpanded, rightWidthPx, setOpen]);

  return null;
}
