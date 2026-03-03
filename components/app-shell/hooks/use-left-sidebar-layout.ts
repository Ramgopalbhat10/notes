import { useEffect, useMemo, useState } from "react";

type UseLeftSidebarLayoutOptions = {
  leftSidebarExpanded: boolean;
  leftSidebarWidthRem: number;
  leftSidebarExpandedRem: number;
  remInPx: number;
};

type UseLeftSidebarLayoutResult = {
  isMobile: boolean;
  leftSidebarWidthValue: string;
  leftSidebarWidthPx: number;
};

export function useLeftSidebarLayout({
  leftSidebarExpanded,
  leftSidebarWidthRem,
  leftSidebarExpandedRem,
  remInPx,
}: UseLeftSidebarLayoutOptions): UseLeftSidebarLayoutResult {
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === "undefined" ? 0 : window.innerWidth,
  );

  useEffect(() => {
    const checkMobile = () => setViewportWidth(window.innerWidth);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isMobile = viewportWidth > 0 ? viewportWidth < 768 : false;

  return useMemo(() => {
    const leftSidebarWidthValue = leftSidebarExpanded
      ? isMobile
        ? "100vw"
        : `${leftSidebarExpandedRem}rem`
      : isMobile
        ? "100vw"
        : `${leftSidebarWidthRem}rem`;

    const leftSidebarWidthPx = leftSidebarExpanded
      ? isMobile
        ? viewportWidth
        : leftSidebarExpandedRem * remInPx
      : leftSidebarWidthRem * remInPx;

    return {
      isMobile,
      leftSidebarWidthValue,
      leftSidebarWidthPx,
    };
  }, [
    isMobile,
    leftSidebarExpanded,
    leftSidebarWidthRem,
    leftSidebarExpandedRem,
    remInPx,
    viewportWidth,
  ]);
}
