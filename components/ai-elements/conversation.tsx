"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";
import type { ComponentProps } from "react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

type ConversationScrollContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  scrollToElement: (element: HTMLElement | null, options?: { position?: "top" | "center" }) => void;
};

const ConversationScrollContext = createContext<ConversationScrollContextValue | null>(null);

export type ConversationHandle = {
  getScrollPosition: () => number;
  setScrollPosition: (position: number) => void;
  scrollToBottom: (options?: { behavior?: ScrollBehavior }) => void;
  scrollToElement: (element: HTMLElement | null, options?: { position?: "top" | "center" }) => void;
  getScrollState: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
};

export type ConversationProps = ComponentProps<"div">;

export const Conversation = forwardRef<ConversationHandle, ConversationProps>(
  function Conversation({ className, children, ...props }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const scrollToBottom = useCallback((options?: { behavior?: ScrollBehavior }) => {
      const node = scrollRef.current;
      if (!node) {
        return;
      }
      node.scrollTo({ top: node.scrollHeight, behavior: options?.behavior ?? "smooth" });
    }, []);

    const scrollToElement = useCallback((element: HTMLElement | null, options?: { position?: "top" | "center" }) => {
      const node = scrollRef.current;
      if (!node || !element) {
        return;
      }
      const containerRect = node.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop = elementRect.top - containerRect.top + node.scrollTop;
      
      let targetScroll: number;
      if (options?.position === "center") {
        targetScroll = relativeTop - (containerRect.height / 2) + (elementRect.height / 2);
      } else {
        // Default: position at top with small padding
        targetScroll = relativeTop - 16;
      }
      
      node.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
    }, []);

    const handleScroll = useCallback(() => {
      const node = scrollRef.current;
      if (!node) {
        return;
      }
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      setIsAtBottom(distance <= 4);
    }, []);

    useEffect(() => {
      const node = scrollRef.current;
      if (!node) {
        return;
      }
      handleScroll();
      node.addEventListener("scroll", handleScroll, { passive: true });
      return () => node.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    useImperativeHandle(ref, () => ({
      getScrollPosition: () => scrollRef.current?.scrollTop ?? 0,
      setScrollPosition: (position: number) => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = position;
        }
      },
      scrollToBottom,
      scrollToElement,
      getScrollState: () => {
        const node = scrollRef.current;
        if (!node) return { scrollTop: 0, scrollHeight: 0, clientHeight: 0 };
        return {
          scrollTop: node.scrollTop,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
        };
      },
    }), [scrollToBottom, scrollToElement]);

    const value = useMemo(
      () => ({
        isAtBottom,
        scrollToBottom,
        scrollToElement,
      }),
      [isAtBottom, scrollToBottom, scrollToElement],
    );

    return (
      <ConversationScrollContext.Provider value={value}>
        <div
          ref={scrollRef}
          className={cn("relative flex-1 min-w-0 overflow-y-auto overflow-x-hidden", className)}
          role="log"
          {...props}
        >
          {children}
        </div>
      </ConversationScrollContext.Provider>
    );
  }
);

export type ConversationContentProps = ComponentProps<"div">;

export function ConversationContent({ className, ...props }: ConversationContentProps) {
  return <div className={cn("p-4 min-w-0 overflow-x-hidden", className)} {...props} />;
}

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export function ConversationEmptyState({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
          <div className="space-y-1">
            <h3 className="font-medium text-sm">{title}</h3>
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

function useConversationScrollContext() {
  const context = useContext(ConversationScrollContext);
  if (!context) {
    throw new Error("ConversationScroll components must be used within <Conversation>");
  }
  return context;
}

export function ConversationScrollButton({ className, ...props }: ConversationScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useConversationScrollContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  if (isAtBottom) {
    return null;
  }

  return (
    <Button
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md",
        className,
      )}
      onClick={handleScrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );
}
