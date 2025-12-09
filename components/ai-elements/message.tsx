import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, HTMLAttributes } from "react";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export function Message({ className, from, ...props }: MessageProps) {
  return (
    <div
      className={cn(
        "group flex w-full items-end justify-end gap-2 py-3",
        from === "user"
          ? "is-user"
          : "is-assistant flex-row-reverse justify-end",
        className,
      )}
      {...props}
    />
  );
}

const messageContentVariants = cva(
  "is-user:dark flex flex-col gap-2 overflow-hidden rounded-lg text-[13px]",
  {
    variants: {
      variant: {
        contained: [
          "px-3 py-2",
          "group-[.is-user]:bg-secondary group-[.is-user]:text-primary-foreground",
          "group-[.is-assistant]:bg-secondary group-[.is-assistant]:text-foreground",
        ],
        flat: [
          "group-[.is-user]:bg-secondary group-[.is-user]:px-3 group-[.is-user]:py-2 group-[.is-user]:text-foreground",
          "group-[.is-assistant]:text-foreground",
        ],
      },
    },
    defaultVariants: {
      variant: "contained",
    },
  },
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof messageContentVariants>;

export function MessageContent({ children, className, variant, ...props }: MessageContentProps) {
  return (
    <div className={cn(messageContentVariants({ variant, className }))} {...props}>
      {children}
    </div>
  );
}

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src?: string;
  name?: string;
};

export function MessageAvatar({ src, name, className, ...props }: MessageAvatarProps) {
  const initials = name?.slice(0, 2)?.toUpperCase() || "AI";
  return (
    <Avatar className={cn("size-8 ring-1 ring-border", className)} {...props}>
      {src ? <AvatarImage alt={name ?? ""} className="object-cover" src={src} /> : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
