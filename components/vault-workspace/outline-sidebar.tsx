"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronsDown, ChevronsUp, ListTree } from "lucide-react";

import { buildMarkdownOutline, type MarkdownOutlineNode } from "@/lib/markdown-outline";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";

const NODE_INDENT_PX = 14;
const CONNECTOR_LEFT_OFFSET_PX = 10;
const HIGHLIGHT_DURATION_MS = 2_000;

export function OutlineSidebar({ onNavigateToSection }: { onNavigateToSection?: () => void }) {
  const fileKey = useEditorStore((state) => state.fileKey);
  const content = useEditorStore((state) => state.content);
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const outline = useMemo(() => buildMarkdownOutline(content), [content]);
  const outlineIndexById = useMemo(() => {
    const map = new Map<string, number>();
    outline.flat.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [outline.flat]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const clearHighlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const defaultExpanded = collectExpandableState(outline.tree, true);
    setExpanded((current) => {
      const next = { ...defaultExpanded };
      for (const [id, value] of Object.entries(next)) {
        if (id in current) {
          next[id] = current[id]!;
        }
      }
      return next;
    });
    setActiveId(null);
  }, [fileKey, outline.tree]);

  useEffect(() => {
    return () => {
      if (clearHighlightTimeoutRef.current) {
        window.clearTimeout(clearHighlightTimeoutRef.current);
      }
    };
  }, []);

  const focusHeadingWithRetry = useCallback((headingId: string, headingIndex: number, retries: number) => {
    const applyHighlight = (target: HTMLElement) => {
      target.classList.remove("outline-target-highlight");
      void target.getBoundingClientRect();
      target.classList.add("outline-target-highlight");

      if (clearHighlightTimeoutRef.current) {
        window.clearTimeout(clearHighlightTimeoutRef.current);
      }
      clearHighlightTimeoutRef.current = window.setTimeout(() => {
        target.classList.remove("outline-target-highlight");
      }, HIGHLIGHT_DURATION_MS);
    };
    const scrollToTop = (target: HTMLElement) => {
      const scroller = findScrollableAncestor(target);
      if (!scroller) {
        target.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const targetTop = scroller.scrollTop + (targetRect.top - scrollerRect.top - 15);
      const previousBehavior = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = "auto";
      scroller.scrollTop = targetTop;
      window.requestAnimationFrame(() => {
        scroller.style.scrollBehavior = previousBehavior;
      });
    };

    const tryFocus = (remainingAttempts: number) => {
      let target = document.getElementById(headingId);
      if (!target && headingIndex >= 0) {
        const headings = document.querySelectorAll<HTMLElement>(
          ".markdown-preview h1, .markdown-preview h2, .markdown-preview h3, .markdown-preview h4, .markdown-preview h5, .markdown-preview h6",
        );
        target = headings[headingIndex] ?? null;
        if (target && !target.id) {
          target.id = headingId;
          target.dataset.outlineId = headingId;
        }
      }
      if (!target) {
        if (remainingAttempts > 0) {
          window.setTimeout(() => tryFocus(remainingAttempts - 1), 60);
        }
        return;
      }

      scrollToTop(target);
      window.requestAnimationFrame(() => applyHighlight(target));
    };

    tryFocus(retries);
  }, []);

  const handleNavigate = useCallback((headingId: string) => {
    const headingIndex = outlineIndexById.get(headingId) ?? -1;
    setActiveId(headingId);
    if (mode === "edit") {
      setMode("preview");
      window.setTimeout(() => focusHeadingWithRetry(headingId, headingIndex, 20), 100);
      onNavigateToSection?.();
      return;
    }
    focusHeadingWithRetry(headingId, headingIndex, 8);
    onNavigateToSection?.();
  }, [focusHeadingWithRetry, mode, onNavigateToSection, outlineIndexById, setMode]);

  const handleExpandAll = useCallback(() => {
    setExpanded(collectExpandableState(outline.tree, true));
  }, [outline.tree]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(collectExpandableState(outline.tree, false));
  }, [outline.tree]);

  const toggleNode = useCallback((id: string) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  if (!fileKey) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        Select a file to view its outline.
      </div>
    );
  }

  if (outline.tree.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-10 items-center justify-between border-b border-border/40 px-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListTree className="h-4 w-4" />
            Outline
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
          No headings found in this file.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center justify-between border-b border-border/40 px-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ListTree className="h-4 w-4" />
          Outline
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Expand all outline sections"
            onClick={handleExpandAll}
          >
            <ChevronsDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Collapse all outline sections"
            onClick={handleCollapseAll}
          >
            <ChevronsUp className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="space-y-0.5">
          {outline.tree.map((node) => (
            <OutlineTreeNode
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              activeId={activeId}
              onToggleNode={toggleNode}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OutlineTreeNode({
  node,
  depth,
  expanded,
  activeId,
  onToggleNode,
  onNavigate,
}: {
  node: MarkdownOutlineNode;
  depth: number;
  expanded: Record<string, boolean>;
  activeId: string | null;
  onToggleNode: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = hasChildren ? expanded[node.id] ?? true : false;
  const isActive = activeId === node.id;
  const connectorLeft = depth * NODE_INDENT_PX + CONNECTOR_LEFT_OFFSET_PX;

  return (
    <div className="space-y-0.5">
      <div className="group flex items-center rounded-md px-1 py-0.5 transition-colors hover:bg-muted/20">
        <div style={{ width: depth * NODE_INDENT_PX }} aria-hidden="true" />
        {hasChildren ? (
          <button
            type="button"
            className="mr-1 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={isExpanded ? `Collapse ${node.text}` : `Expand ${node.text}`}
            onClick={() => onToggleNode(node.id)}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
          </button>
        ) : (
          <span className="mr-1 inline-block h-4 w-4" aria-hidden="true" />
        )}
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isActive
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground/80 hover:bg-muted/30 hover:text-foreground",
          )}
          title={node.text}
          onClick={() => onNavigate(node.id)}
        >
          {node.text}
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute ml-1 bottom-0 top-0 z-10 border-l border-border/40"
            style={{ left: connectorLeft }}
          />
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <OutlineTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                activeId={activeId}
                onToggleNode={onToggleNode}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function collectExpandableState(nodes: MarkdownOutlineNode[], expanded: boolean): Record<string, boolean> {
  const state: Record<string, boolean> = {};

  const traverse = (items: MarkdownOutlineNode[]) => {
    for (const item of items) {
      if (item.children.length > 0) {
        state[item.id] = expanded;
        traverse(item.children);
      }
    }
  };

  traverse(nodes);
  return state;
}

function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
    if (canScrollY && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}
