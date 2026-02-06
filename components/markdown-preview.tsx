"use client";

import type { ComponentProps, ImgHTMLAttributes } from "react";
import { useCallback } from "react";
import { Block, defaultUrlTransform, Streamdown } from "streamdown";
import type { StreamdownProps } from "streamdown";

import { BeautifulMermaidDiagram } from "@/components/markdown/beautiful-mermaid-diagram";
import { isAllowedMarkdownImageUrl } from "@/lib/markdown-image-policy";
import { cn } from "@/lib/utils";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
};

const MERMAID_FENCE_PATTERN = /^\s*```mermaid[^\n]*\n([\s\S]*?)\n?```\s*$/i;

function extractMermaidFence(content: string): string | null {
  const match = content.match(MERMAID_FENCE_PATTERN);
  if (!match) {
    return null;
  }

  const diagram = match[1]?.trim();
  return diagram ? diagram : null;
}

type StreamdownBlockProps = ComponentProps<typeof Block>;

function MermaidAwareBlock(props: StreamdownBlockProps) {
  const diagram = extractMermaidFence(props.content);

  if (!diagram) {
    return <Block {...props} />;
  }

  return <BeautifulMermaidDiagram chart={diagram} />;
}

type MarkdownImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
};

function MarkdownImage({ className, alt, src, ...props }: MarkdownImageProps) {
  if (!src) {
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

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const secureUrlTransform: NonNullable<StreamdownProps["urlTransform"]> = useCallback((url, key, node) => {
    const safeUrl = defaultUrlTransform(url);
    if (!safeUrl) {
      return "";
    }

    const nodeTag = typeof node === "object" && node && "tagName" in node
      ? String((node as { tagName?: unknown }).tagName ?? "")
      : "";

    if (key === "src" && nodeTag === "img" && !isAllowedMarkdownImageUrl(safeUrl)) {
      return "";
    }

    return safeUrl;
  }, []);

  const trimmed = content.trim();

  if (!trimmed) {
    return (
      <div className={cn("rounded-lg pt-4 md:pt-6 text-sm md:text-base text-muted-foreground", className)}>
        This note has no content yet. Switch to Edit mode to start writing.
      </div>
    );
  }

  return (
    <div className={cn("markdown-preview px-4 md:px-0 markdown-content text-sm md:text-base leading-7 w-full max-w-full", className)}>
      <Streamdown
        BlockComponent={MermaidAwareBlock}
        className="space-y-4"
        components={{ img: MarkdownImage }}
        controls={{ code: true, mermaid: false, table: true }}
        parseIncompleteMarkdown
        urlTransform={secureUrlTransform}
      >
        {content}
      </Streamdown>
    </div>
  );
}
