"use client";

import { MarkdownPreview } from "@/components/markdown-preview";
import { cn } from "@/lib/utils";
import { memo } from "react";
import type { ReactNode } from "react";

type ResponseProps = {
  className?: string;
  wrapperClassName?: string;
  children?: ReactNode;
  compact?: boolean;
};

export const Response = memo(({ className, wrapperClassName, children, compact = false }: ResponseProps) => {
  const content = Array.isArray(children)
    ? children.map((child) => (typeof child === "string" ? child : "")).join("")
    : typeof children === "string"
      ? children
      : "";

  return (
    <div className={cn("w-full min-w-0 overflow-hidden", wrapperClassName)}>
      {content ? (
        <MarkdownPreview 
          content={content} 
          className={cn(
            "markdown-content",
            compact && [
              "!text-[13px] !leading-relaxed",
              "[&_h1]:!text-base [&_h1]:!mt-3",
              "[&_h2]:!text-sm [&_h2]:!mt-2",
              "[&_h3]:!text-[13px] [&_h3]:!mt-2",
              "[&_h4]:!text-[13px] [&_h4]:!mt-2",
              "[&_p]:!mt-1.5 [&_p]:!leading-relaxed",
              "[&_ul]:!my-1.5 [&_ul]:!ml-4",
              "[&_ol]:!my-1.5 [&_ol]:!ml-4",
              "[&_li]:!leading-relaxed",
              "[&_blockquote]:!mt-1.5",
              "[&_table]:!text-[13px]",
              "[&_th]:!py-1.5 [&_th]:!px-2",
              "[&_td]:!py-1.5 [&_td]:!px-2",
              "[&_pre]:!my-2",
            ],
            className
          )} 
        />
      ) : null}
    </div>
  );
},
  (prevProps, nextProps) => prevProps.children === nextProps.children && prevProps.compact === nextProps.compact,
);

Response.displayName = "Response";
