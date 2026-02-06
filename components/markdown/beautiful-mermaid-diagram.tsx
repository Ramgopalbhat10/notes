"use client";

import { renderMermaid, renderMermaidAscii } from "beautiful-mermaid";
import type { RenderOptions } from "beautiful-mermaid";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type BeautifulMermaidDiagramProps = {
  chart: string;
  className?: string;
};

type ThemeMode = "light" | "dark";
type MermaidViewMode = "diagram" | "unicode";

function detectMobile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 640px)").matches;
}

function getThemeMode(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function cssVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value || fallback;
}

function buildRenderOptions(mode: ThemeMode): RenderOptions {
  if (typeof document === "undefined") {
    return mode === "dark"
      ? { bg: "#222222", fg: "#e5e5e5", transparent: true }
      : { bg: "#ffffff", fg: "#27272a", transparent: true };
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const background = cssVar(rootStyle, "--background", mode === "dark" ? "#222222" : "#ffffff");
  const foreground = cssVar(rootStyle, "--foreground", mode === "dark" ? "#e5e5e5" : "#27272a");
  const muted = cssVar(rootStyle, "--muted-foreground", mode === "dark" ? "#a1a1aa" : "#52525b");
  const border = cssVar(rootStyle, "--border", mode === "dark" ? "#3f3f46" : "#d4d4d8");
  const accent = cssVar(rootStyle, "--primary", mode === "dark" ? "#6ee7b7" : "#0f766e");

  return {
    bg: background,
    fg: foreground,
    accent,
    border,
    line: border,
    muted,
    transparent: true,
  };
}

export function BeautifulMermaidDiagram({ chart, className }: BeautifulMermaidDiagramProps) {
  const [isMobile, setIsMobile] = useState<boolean>(() => detectMobile());
  const [viewMode, setViewMode] = useState<MermaidViewMode>(() => (detectMobile() ? "unicode" : "diagram"));
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());
  const [svg, setSvg] = useState<string | null>(null);
  const [unicode, setUnicode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizedChart = useMemo(() => chart.trim(), [chart]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 640px)");
    const handleMediaChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      if (event.matches) {
        setViewMode("unicode");
      }
    };
    setIsMobile(media.matches);
    if (media.matches) {
      setViewMode("unicode");
    }
    media.addEventListener("change", handleMediaChange);

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setMode(getThemeMode());
    });
    observer.observe(root, { attributeFilter: ["class"] });

    return () => {
      media.removeEventListener("change", handleMediaChange);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setLoading(true);
      setError(null);

      let nextSvg: string | null = null;
      let nextUnicode: string | null = null;
      let renderErrorMessage: string | null = null;

      try {
        nextSvg = await renderMermaid(normalizedChart, buildRenderOptions(mode));
      } catch (renderError) {
        renderErrorMessage = renderError instanceof Error ? renderError.message : "Failed to render Mermaid diagram";
      }

      try {
        nextUnicode = renderMermaidAscii(normalizedChart, {
          useAscii: false,
          paddingX: isMobile ? 4 : 5,
          paddingY: isMobile ? 2 : 4,
          boxBorderPadding: 1,
        });
      } catch (unicodeError) {
        if (!renderErrorMessage) {
          renderErrorMessage = unicodeError instanceof Error ? unicodeError.message : "Failed to render Mermaid Unicode";
        }
      }

      if (!cancelled) {
        setSvg(nextSvg);
        setUnicode(nextUnicode);
        if (!nextSvg && !nextUnicode) {
          setError(renderErrorMessage ?? "Failed to render Mermaid diagram");
        } else {
          setError(renderErrorMessage);
        }
        setLoading(false);
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [isMobile, mode, normalizedChart]);

  if (loading && !svg && !unicode) {
    return (
      <div className={cn("my-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground", className)}>
        Rendering Mermaid diagram...
      </div>
    );
  }

  if (!svg && !unicode) {
    return (
      <div className={cn("my-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4", className)}>
        <p className="mb-2 text-sm font-medium text-destructive">Unable to render Mermaid diagram.</p>
        <pre className="overflow-auto rounded bg-muted p-3 text-xs text-foreground">{chart}</pre>
      </div>
    );
  }

  const showUnicode = viewMode === "unicode" || !svg;

  return (
    <div aria-label="Mermaid diagram" className={cn("w-full", className)} data-streamdown="mermaid-renderer" role="img">
      <div className="mb-2 flex items-center justify-end gap-1">
        <button
          className={cn(
            "h-7 rounded-md border px-2 text-[11px] font-medium transition-colors",
            !showUnicode ? "border-border bg-background text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setViewMode("diagram")}
          type="button"
        >
          Diagram
        </button>
        <button
          className={cn(
            "h-7 rounded-md border px-2 text-[11px] font-medium transition-colors",
            showUnicode ? "border-border bg-background text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setViewMode("unicode")}
          type="button"
        >
          Unicode
        </button>
      </div>

      <div data-streamdown="mermaid-viewport">
        <div data-streamdown="mermaid-canvas">
          {!showUnicode && svg ? (
            <div dangerouslySetInnerHTML={{ __html: svg }} data-streamdown="mermaid-visual" />
          ) : (
            <pre data-streamdown="mermaid-unicode">
              <code>{unicode ?? ""}</code>
            </pre>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-muted-foreground">Rendered with fallback mode: {error}</p>
      ) : null}
    </div>
  );
}
