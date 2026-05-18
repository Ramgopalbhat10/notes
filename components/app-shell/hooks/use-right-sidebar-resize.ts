"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseRightSidebarResizeOptions = {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
};

export function useRightSidebarResize({
  initialWidth,
  minWidth,
  maxWidth,
  onResize,
}: UseRightSidebarResizeOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    startX: 0,
    startWidth: initialWidth,
    currentWidth: initialWidth,
    minWidth,
    maxWidth,
    onResize,
  });

  // Sync refs with latest props
  useEffect(() => {
    stateRef.current.minWidth = minWidth;
    stateRef.current.maxWidth = maxWidth;
    stateRef.current.onResize = onResize;
  }, [minWidth, maxWidth, onResize]);

  useEffect(() => {
    stateRef.current.startWidth = initialWidth;
    stateRef.current.currentWidth = initialWidth;
  }, [initialWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { startX, startWidth, minWidth: minW, maxWidth: maxW } = stateRef.current;
      const delta = startX - e.clientX;
      const newWidth = Math.max(minW, Math.min(maxW, startWidth + delta));
      stateRef.current.currentWidth = newWidth;
      if (elementRef.current) {
        elementRef.current.style.width = `${newWidth}px`;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      stateRef.current.onResize(Math.round(stateRef.current.currentWidth));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      stateRef.current.startX = e.clientX;
      stateRef.current.startWidth = initialWidth;
      stateRef.current.currentWidth = initialWidth;
      setIsDragging(true);
    },
    [initialWidth],
  );

  return { isDragging, startResize, elementRef };
}
