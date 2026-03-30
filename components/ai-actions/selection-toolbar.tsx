"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AI_ACTIONS } from "@/components/vault-workspace/constants";
import type { AiActionType } from "@/components/vault-workspace/types";

type SelectionToolbarProps = {
  selectedText: string;
  busy: boolean;
  disabled: boolean;
  onSelect: (action: AiActionType) => void;
  showLabel?: boolean;
  boundaryRef?: React.RefObject<HTMLElement | null>;
  preferredPlacement?: "auto" | "above" | "below";
};

type ToolbarPosition = {
  left: number;
  top: number;
  placement: "above" | "below";
};

const HEADER_CLEARANCE_PX = 56;
const TOOLBAR_GAP_PX = 8;

export function SelectionToolbar({
  selectedText,
  busy,
  disabled,
  onSelect,
  showLabel = true,
  boundaryRef,
  preferredPlacement = "auto",
}: SelectionToolbarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isPointerSelectingRef = useRef(false);
  const [position, setPosition] = useState<ToolbarPosition | null>(null);

  const hasSelection = selectedText.trim().length > 0;

  useEffect(() => {
    const resolvedBoundary = boundaryRef?.current ?? rootRef.current?.parentElement;
    if (!hasSelection) {
      setPosition(null);
      return;
    }
    if (!resolvedBoundary) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const root = rootRef.current;
      const boundary = boundaryRef?.current ?? root?.parentElement ?? resolvedBoundary;
      const selection = window.getSelection();
      if (!root || !boundary || !selection || selection.rangeCount === 0 || selection.isCollapsed || isPointerSelectingRef.current) {
        setPosition(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element | null);
      if (!ancestor || !boundary.contains(ancestor)) {
        setPosition(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const clientRects = Array.from(range.getClientRects()).filter((candidate) => candidate.width > 0 || candidate.height > 0);
      const firstRect = clientRects[0] ?? rect;
      const lastRect = clientRects[clientRects.length - 1] ?? rect;
      const boundaryRect = boundary.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPosition({
          left: Math.max(96, Math.min(window.innerWidth - 96, boundaryRect.left + boundaryRect.width / 2)),
          top: boundaryRect.top + HEADER_CLEARANCE_PX,
          placement: "below",
        });
        return;
      }

      const availableAbove = rect.top - HEADER_CLEARANCE_PX;
      const placement = preferredPlacement === "below"
        ? "below"
        : preferredPlacement === "above"
          ? "above"
          : availableAbove < 56
            ? "below"
            : "above";
      const anchorRect = placement === "above" ? firstRect : lastRect;
      const nextLeft = Math.max(
        96,
        Math.min(window.innerWidth - 96, anchorRect.left + anchorRect.width / 2),
      );
      const nextTop = placement === "above"
        ? Math.max(HEADER_CLEARANCE_PX, firstRect.top - TOOLBAR_GAP_PX)
        : Math.min(window.innerHeight - TOOLBAR_GAP_PX, lastRect.bottom + TOOLBAR_GAP_PX);
      setPosition({ left: nextLeft, top: nextTop, placement });
    };

    const handlePointerDown = () => {
      isPointerSelectingRef.current = true;
      setPosition(null);
    };

    const handlePointerUp = () => {
      isPointerSelectingRef.current = false;
      window.requestAnimationFrame(updatePosition);
    };

    const rafId = window.requestAnimationFrame(updatePosition);
    resolvedBoundary.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      resolvedBoundary.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [boundaryRef, hasSelection, preferredPlacement, selectedText]);

  const toolbar = useMemo(() => {
    if (!position || !hasSelection) {
      return null;
    }

    return (
        <div
        className="pointer-events-none fixed z-30 transition-opacity duration-150"
        style={{
          left: position.left,
          top: position.top,
          transform: position.placement === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
        }}
      >
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border border-border bg-popover px-1 py-1 shadow-sm">
          {showLabel ? (
            <span className="pl-2 pr-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              AI
            </span>
          ) : null}
          {AI_ACTIONS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 px-2.5 text-xs font-medium",
                busy && "pointer-events-none opacity-60",
              )}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(item.value)}
              aria-label={item.label}
            >
              <item.icon className="mr-1.5 h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }, [busy, disabled, hasSelection, onSelect, position]);

  return <div ref={rootRef} className="pointer-events-none absolute inset-0 z-20">{toolbar}</div>;
}
