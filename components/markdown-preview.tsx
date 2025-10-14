"use client";

import { Children, isValidElement, useMemo } from "react";
import type { ComponentPropsWithoutRef } from "react";
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

const CodeBlock: Components["code"] = ({ inline, className, children, ...props }: CodeProps) => {
  const childArray = Children.toArray(children);
  const textContent = childArray
    .map((child) => (typeof child === "string" ? child : ""))
    .join("");
  const hasLanguage = typeof className === "string" && className.includes("language-");
  const isInline = inline === true || (!hasLanguage && !textContent.includes("\n"));

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
  return (
    <pre className="my-4 md:my-6 w-full overflow-x-auto rounded-md border bg-muted/50 p-2 md:p-4 text-xs md:text-sm">
      <code className={cn("font-mono text-xs leading-5", className)} {...props}>
        {children}
      </code>
    </pre>
  );
};

const components: Components = {
  h1: (props) => (
    <h1 className="scroll-m-20 text-3xl font-semibold tracking-tight" {...props} />
  ),
  h2: (props) => (
    <h2 className="mt-6 md:mt-8 scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0" {...props} />
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
        className="w-full border-collapse text-left text-xs md:text-sm [&_th]:border-b [&_th]:px-2 md:[&_th]:px-3 [&_th]:py-2 [&_td]:border-b [&_td]:px-2 md:[&_td]:px-3 [&_td]:py-2"
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
      <div className={cn("rounded-lg border border-dashed border-muted p-4 md:p-6 text-sm md:text-base text-muted-foreground", className)}>
        This note has no content yet. Switch to Edit mode to start writing.
      </div>
    );
  }

  return (
    <div className={cn("markdown-preview text-sm md:text-base leading-7 w-full max-w-full", className)}>
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
