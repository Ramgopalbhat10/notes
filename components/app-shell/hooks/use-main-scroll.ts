import { useCallback, useEffect, useRef, useState } from "react";

type UseMainScrollOptions = {
  dependency: unknown;
};

type UseMainScrollResult = {
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  isMainScrollable: boolean;
  scrollMainToTop: () => void;
};

export function useMainScroll({ dependency }: UseMainScrollOptions): UseMainScrollResult {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [isMainScrollable, setIsMainScrollable] = useState(false);

  const updateMainScrollMetrics = useCallback(() => {
    const el = mainScrollRef.current;
    if (!el) {
      return;
    }
    const scrollable = el.scrollHeight - el.clientHeight > 8;
    setIsMainScrollable(scrollable);
  }, []);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) {
      return;
    }

    updateMainScrollMetrics();

    const handleScroll = () => updateMainScrollMetrics();
    el.addEventListener("scroll", handleScroll);

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateMainScrollMetrics()) : null;
    if (resizeObserver) {
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateMainScrollMetrics]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const id = window.requestAnimationFrame(() => updateMainScrollMetrics());
    return () => window.cancelAnimationFrame(id);
  }, [dependency, updateMainScrollMetrics]);

  const scrollMainToTop = useCallback(() => {
    const el = mainScrollRef.current;
    if (!el) {
      return;
    }

    el.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    mainScrollRef,
    isMainScrollable,
    scrollMainToTop,
  };
}
