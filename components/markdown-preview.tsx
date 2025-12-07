"use client";

import { Check, Copy } from "lucide-react";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
import vsLight from "react-syntax-highlighter/dist/esm/styles/prism/vs";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema, type Options as RehypeSanitizeOptions } from "rehype-sanitize";
import { cn } from "@/lib/utils";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
};

type CodeProps = ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
};

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("diff", diff);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("yaml", yaml);

const CodeBlock: Components["code"] = ({ inline, className, children, style: _style, ...props }: CodeProps) => {
  const childArray = Children.toArray(children);
  const textContent = childArray
    .map((child) => (typeof child === "string" ? child : ""))
    .join("");

  const language = useMemo(() => {
    const match = typeof className === "string" ? className.match(/language-([\w-]+)/) : null;
    return match?.[1] ?? "text";
  }, [className]);

  const codeText = useMemo(() => textContent.replace(/\n$/, ""), [textContent]);
  const resolvedLanguage = useMemo(() => {
    if (language && language !== "text") return language;
    const lower = codeText.toLowerCase();
    if (/^\s*#!/.test(codeText) || /import\s+\w+/.test(lower) || /\bdef\b|\bclass\b/.test(lower)) {
      return "python";
    }
    if (/console\.log|\bfunction\b|\bconst\b|\blet\b|=>/.test(codeText)) return "javascript";
    if (/select\s+.+\s+from/i.test(codeText)) return "sql";
    if (/<[a-z][\s\S]*>/i.test(codeText)) return "markup";
    return "plaintext";
  }, [codeText, language]);

  const isInline =
    inline === true || ((!language || language === "text") && !codeText.includes("\n"));
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const handleCopy = useCallback(async () => {
    if (!codeText) return;
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Failed to copy code", error);
    }
  }, [codeText]);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    },
    [],
  );

  if (isInline) {
    return (
      <code
        className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-xs", className)}
        {...props}
      >
        {children}
      </code>
    );
  }

  const themeStyles = useMemo<{ [key: string]: CSSProperties }>(
    () => (isDarkMode ? (vscDarkPlus as { [key: string]: CSSProperties }) : (vsLight as { [key: string]: CSSProperties })),
    [isDarkMode],
  );

  return (
    <div className="group relative my-4 md:my-6 w-full overflow-hidden rounded-md border border-border/60 bg-muted/60">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground opacity-0 shadow-sm transition hover:-translate-y-px hover:border-primary/60 hover:text-primary focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 group-hover:opacity-100"
        aria-label={copied ? "Code copied" : "Copy code"}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <SyntaxHighlighter
        language={resolvedLanguage}
        style={themeStyles}
        PreTag="pre"
        wrapLines
        wrapLongLines
        useInlineStyles
        className="text-xs md:text-sm"
        customStyle={{
          margin: 0,
          padding: "1rem 1.25rem",
          paddingRight: "3rem",
          background: "transparent",
          overflow: "auto",
          lineHeight: 1.6,
        }}
        codeTagProps={{
          className: cn("font-mono leading-6", className),
        }}
        {...props}
      >
        {codeText}
      </SyntaxHighlighter>
    </div>
  );
};

const components: Components = {
  h1: (props) => (
    <h1 className="mt-4 scroll-m-20 text-3xl font-semibold tracking-tight" {...props} />
  ),
  h2: (props) => (
    <h2 className="mt-4 md:mt-6 scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-4 md:mt-6 scroll-m-20 text-xl font-semibold tracking-tight" {...props} />
  ),
  h4: (props) => (
    <h4 className="mt-4 md:mt-6 scroll-m-20 text-lg font-semibold tracking-tight" {...props} />
  ),
  p: ({ children, className, ...props }) => {
    const childArray = Children.toArray(children);
    const containsBlockElement = childArray.some(
      (child) => isValidElement(child) && child.type === "pre",
    );

    if (containsBlockElement) {
      return <div className={cn("leading-7 [&:not(:first-child)]:mt-4 md:[&:not(:first-child)]:mt-6", className)}>{children}</div>;
    }

    return (
      <p className={cn("leading-7 [&:not(:first-child)]:mt-4 md:[&:not(:first-child)]:mt-6", className)} {...props}>
        {children}
      </p>
    );
  },
  ul: (props) => <ul className="my-4 md:my-6 ml-4 md:ml-6 list-disc space-y-1" {...props} />,
  ol: (props) => <ol className="my-4 md:my-6 ml-6 md:ml-6 list-decimal space-y-1" {...props} />,
  li: (props) => <li className="leading-7" {...props} />,
  blockquote: (props) => (
    <blockquote className="mt-4 md:mt-6 border-l-2 pl-4 md:pl-6 italic text-muted-foreground" {...props} />
  ),
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  a: (props) => (
    <a className="font-medium text-primary underline underline-offset-4" {...props} />
  ),
  code: CodeBlock,
  table: (props) => (
    <div className="my-4 md:my-6 overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-xs md:text-sm [&_th]:border-b [&_th]:px-2 md:[&_th]:px-3 [&_th]:py-2 [&_th]:align-top [&_td]:border-b [&_td]:px-2 md:[&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:break-words [&_td]:whitespace-pre-wrap"
        {...props}
      />
    </div>
  ),
  hr: (props) => <hr className="my-6 md:my-8 border-muted" {...props} />,
};

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const schema = useMemo<RehypeSanitizeOptions>(() => {
    const attributes = defaultSchema.attributes ?? {};
    return {
      ...defaultSchema,
      attributes: {
        ...attributes,
        code: [...(attributes.code ?? []), ["className"]],
        span: [...(attributes.span ?? []), ["className"]],
        th: [...(attributes.th ?? []), ["align"]],
        td: [...(attributes.td ?? []), ["align"]],
      },
    } satisfies RehypeSanitizeOptions;
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
