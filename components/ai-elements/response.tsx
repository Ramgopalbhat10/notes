"use client";

import { MarkdownPreview } from "@/components/markdown-preview";
import { cn } from "@/lib/utils";
import { memo } from "react";
import type { ReactNode } from "react";

type ResponseProps = {
  className?: string;
  wrapperClassName?: string;
  children?: ReactNode;
};

export const Response = memo(({ className, wrapperClassName, children }: ResponseProps) => {
  const content = Array.isArray(children)
    ? children.map((child) => (typeof child === "string" ? child : "")).join("")
    : typeof children === "string"
      ? children
      : "";

  return (
    <div className={cn("w-full min-w-0 overflow-hidden", wrapperClassName)}>
      {content ? (
        <MarkdownPreview content={content} className={cn("markdown-content", className)} />
      ) : null}
    </div>
  );
},
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
