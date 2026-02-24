"use client";

import { code } from "@streamdown/code";
import { mermaid as mermaidPlugin } from "@streamdown/mermaid";
import type { ImgHTMLAttributes } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import type { StreamdownProps } from "streamdown";

import { buildMarkdownOutline } from "@/lib/markdown-outline";
import { isAllowedMarkdownImageUrl } from "@/lib/markdown-image-policy";
import { cn } from "@/lib/utils";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
  parseIncompleteMarkdown?: boolean;
};

type ThemeMode = "light" | "dark";
type MermaidConfig = NonNullable<NonNullable<StreamdownProps["mermaid"]>["config"]>;

const STREAMDOWN_PLUGINS: NonNullable<StreamdownProps["plugins"]> = {
  code,
  mermaid: mermaidPlugin,
};

const SHIKI_FALLBACK_LANG_MAP: Record<string, string> = {
  ascii: "text",
  "ascii-art": "text",
};

function normalizeUnsupportedCodeFenceLanguages(markdown: string): string {
  return markdown.replace(
    /^(\s*(?:`{3,}|~{3,}))(\S+)([^\n]*)$/gm,
    (fullMatch, fence, language, suffix) => {
      const fallback = SHIKI_FALLBACK_LANG_MAP[language.toLowerCase()];
      if (!fallback) {
        return fullMatch;
      }
      return `${fence}${fallback}${suffix}`;
    },
  );
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

function toHexColor(input: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }

  const probe = document.createElement("span");
  probe.style.color = input;
  probe.style.position = "absolute";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  probe.style.inset = "-9999px";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  const match = resolved.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    return fallback;
  }

  const [r, g, b] = [match[1], match[2], match[3]].map((value) =>
    Number.parseInt(value, 10).toString(16).padStart(2, "0"),
  );
  return `#${r}${g}${b}`;
}

function buildMermaidConfig(mode: ThemeMode): MermaidConfig {
  if (typeof document === "undefined") {
    return {
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: mode === "dark" ? "dark" : "default",
    };
  }

  const style = getComputedStyle(document.documentElement);
  const background = toHexColor(cssVar(style, "--background", mode === "dark" ? "#171717" : "#ffffff"), mode === "dark" ? "#171717" : "#ffffff");
  const foreground = toHexColor(cssVar(style, "--foreground", mode === "dark" ? "#e5e7eb" : "#18181b"), mode === "dark" ? "#e5e7eb" : "#18181b");
  const border = toHexColor(cssVar(style, "--border", mode === "dark" ? "#3f3f46" : "#d4d4d8"), mode === "dark" ? "#3f3f46" : "#d4d4d8");
  const muted = toHexColor(cssVar(style, "--muted", mode === "dark" ? "#27272a" : "#f4f4f5"), mode === "dark" ? "#27272a" : "#f4f4f5");
  const accent = toHexColor(cssVar(style, "--primary", mode === "dark" ? "#6ee7b7" : "#0f766e"), mode === "dark" ? "#6ee7b7" : "#0f766e");

  return {
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "base",
    fontFamily: "var(--font-family-sans, var(--font-family-sans-fallback))",
    themeVariables: {
      darkMode: mode === "dark",
      background,
      primaryColor: muted,
      secondaryColor: muted,
      tertiaryColor: background,
      primaryBorderColor: border,
      secondaryBorderColor: border,
      tertiaryBorderColor: border,
      primaryTextColor: foreground,
      secondaryTextColor: foreground,
      tertiaryTextColor: foreground,
      textColor: foreground,
      lineColor: border,
      mainBkg: muted,
      nodeBorder: border,
      clusterBkg: background,
      clusterBorder: border,
      edgeLabelBackground: background,
      actorBkg: muted,
      actorBorder: border,
      actorTextColor: foreground,
      signalColor: border,
      signalTextColor: foreground,
      cScale0: accent,
      cScaleLabel0: foreground,
    },
  };
}

type MarkdownImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
};

function MarkdownImage({ className, alt, src, ...props }: MarkdownImageProps) {
  if (typeof src !== "string" || !src || !isAllowedMarkdownImageUrl(src)) {
    return null;
  }

  return (
    <img
      {...props}
      alt={alt ?? ""}
      className={cn("h-auto max-w-full rounded-lg border border-border/40", className)}
      decoding="async"
      loading="lazy"
      src={src}
    />
  );
}

export function MarkdownPreview({
  content,
  className,
  parseIncompleteMarkdown = true,
}: MarkdownPreviewProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getThemeMode());
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeMode(getThemeMode());
    });
    observer.observe(root, { attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  const mermaidOptions = useMemo<NonNullable<StreamdownProps["mermaid"]>>(
    () => ({ config: buildMermaidConfig(themeMode) }),
    [themeMode],
  );
  const normalizedContent = useMemo(() => normalizeUnsupportedCodeFenceLanguages(content), [content]);
  const outline = useMemo(() => buildMarkdownOutline(normalizedContent), [normalizedContent]);
  const streamdownComponents = useMemo<NonNullable<StreamdownProps["components"]>>(
    () => ({ img: MarkdownImage }),
    [],
  );

  const trimmed = normalizedContent.trim();

  useEffect(() => {
    const container = previewRef.current;
    if (!container || !trimmed) {
      return;
    }

    const syncHeadingAnchors = () => {
      const headings = Array.from(
        container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
      );
      const itemCount = Math.min(headings.length, outline.flat.length);
      for (let index = 0; index < itemCount; index += 1) {
        const heading = headings[index];
        const item = outline.flat[index];
        if (!heading || !item) {
          continue;
        }
        heading.id = item.id;
        heading.dataset.outlineId = item.id;
      }
    };

    syncHeadingAnchors();
    const observer = new MutationObserver(syncHeadingAnchors);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [outline.flat, trimmed]);

  if (!trimmed) {
    return (
      <div className={cn("rounded-lg pt-4 md:pt-6 text-sm md:text-base text-muted-foreground", className)}>
        This note has no content yet. Switch to Edit mode to start writing.
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      className={cn("markdown-preview px-4 md:px-0 markdown-content text-sm md:text-base leading-7 w-full max-w-full", className)}
    >
      <Streamdown
        className="space-y-4"
        components={streamdownComponents}
        controls={{ code: true, mermaid: { copy: true, download: true, fullscreen: true, panZoom: true }, table: true }}
        mermaid={mermaidOptions}
        parseIncompleteMarkdown={parseIncompleteMarkdown}
        plugins={STREAMDOWN_PLUGINS}
      >
        {normalizedContent}
      </Streamdown>
    </div>
  );
}
