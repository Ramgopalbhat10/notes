import { useEffect } from "react";

import { useSidebar } from "@/components/ui/sidebar";

type SidebarAutoCollapseProps = {
  leftWidthPx: number;
  rightWidthPx: number;
  minMainRatio: number;
  rightSidebarOpen: boolean;
};

export function SidebarAutoCollapse({
  leftWidthPx,
  rightWidthPx,
  minMainRatio,
  rightSidebarOpen,
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
      const mainWidth = viewportWidth - leftWidth - rightWidthPx;
      if (open && mainWidth / viewportWidth < minMainRatio) {
        setOpen(false);
      }
    };

    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, [leftWidthPx, minMainRatio, open, rightSidebarOpen, rightWidthPx, setOpen]);

  return null;
}
