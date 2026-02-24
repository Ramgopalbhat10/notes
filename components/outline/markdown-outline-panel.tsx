"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronsDown, ChevronsUp, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { buildMarkdownOutline, type MarkdownOutlineNode } from "@/lib/markdown-outline";
import { cn } from "@/lib/utils";

const NODE_INDENT_PX = 14;
const CONNECTOR_LEFT_OFFSET_PX = 10;
const HIGHLIGHT_DURATION_MS = 2_000;
const OUTLINE_HIGHLIGHT_TOKEN_ATTR = "data-outline-highlight-token";

type ScrollBehaviorMode = "instant" | "smooth";

type MarkdownOutlinePanelProps = {
  content: string;
  contextKey: string;
  mode?: "edit" | "preview";
  setMode?: (mode: "preview" | "edit") => void;
  onNavigateToSection?: () => void;
  scrollBehaviorMode?: ScrollBehaviorMode;
};

export function MarkdownOutlinePanel({
  content,
  contextKey,
  mode,
  setMode,
  onNavigateToSection,
  scrollBehaviorMode = "instant",
}: MarkdownOutlinePanelProps) {
  const outline = useMemo(() => buildMarkdownOutline(content), [content]);
  const outlineIndexById = useMemo(() => {
    const map = new Map<string, number>();
    outline.flat.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [outline.flat]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const clearHighlightTimeoutRef = useRef<number | null>(null);
  const highlightedTargetRef = useRef<HTMLElement | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filterActive = normalizedQuery.length > 0;
  const filteredOutline = useMemo(
    () => filterOutlineTree(outline.tree, normalizedQuery),
    [outline.tree, normalizedQuery],
  );
  const visibleTree = filterActive ? filteredOutline.tree : outline.tree;
  const hasOutlineHeadings = outline.tree.length > 0;
  const hasVisibleOutline = visibleTree.length > 0;
  const disableOutlineControls = filterActive || !hasOutlineHeadings;

  useEffect(() => {
    const defaultExpanded = collectExpandableState(outline.tree, true);
    setExpanded((current) => {
      const next = { ...defaultExpanded };
      for (const id of Object.keys(next)) {
        if (id in current) {
          next[id] = current[id]!;
        }
      }
      return next;
    });
    setActiveId(null);
  }, [contextKey, outline.tree]);

  useEffect(() => {
    setQuery("");
  }, [contextKey]);

  useEffect(() => {
    return () => {
      if (clearHighlightTimeoutRef.current) {
        return;
      }
      if (highlightedTargetRef.current) {
        highlightedTargetRef.current.classList.remove("outline-target-highlight");
        highlightedTargetRef.current.removeAttribute(OUTLINE_HIGHLIGHT_TOKEN_ATTR);
        highlightedTargetRef.current = null;
      }
    };
  }, []);

  const focusHeadingWithRetry = useCallback((headingId: string, headingIndex: number, retries: number) => {
    const applyHighlight = (target: HTMLElement) => {
      if (highlightedTargetRef.current && highlightedTargetRef.current !== target) {
        highlightedTargetRef.current.classList.remove("outline-target-highlight");
        highlightedTargetRef.current.removeAttribute(OUTLINE_HIGHLIGHT_TOKEN_ATTR);
      }

      target.classList.remove("outline-target-highlight");
      target.removeAttribute(OUTLINE_HIGHLIGHT_TOKEN_ATTR);
      void target.getBoundingClientRect();
      target.classList.add("outline-target-highlight");
      highlightedTargetRef.current = target;

      const highlightToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      target.setAttribute(OUTLINE_HIGHLIGHT_TOKEN_ATTR, highlightToken);

      if (clearHighlightTimeoutRef.current) {
        window.clearTimeout(clearHighlightTimeoutRef.current);
      }
      clearHighlightTimeoutRef.current = window.setTimeout(() => {
        const token = target.getAttribute(OUTLINE_HIGHLIGHT_TOKEN_ATTR);
        if (token !== highlightToken) {
          return;
        }
        target.classList.remove("outline-target-highlight");
        target.removeAttribute(OUTLINE_HIGHLIGHT_TOKEN_ATTR);
        if (highlightedTargetRef.current === target) {
          highlightedTargetRef.current = null;
        }
      }, HIGHLIGHT_DURATION_MS);
    };

    const scrollToTarget = (target: HTMLElement) => {
      if (scrollBehaviorMode === "smooth") {
        target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
        window.setTimeout(() => applyHighlight(target), 260);
        return;
      }

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

      scrollToTarget(target);
      if (scrollBehaviorMode !== "smooth") {
        window.requestAnimationFrame(() => applyHighlight(target));
      }
    };

    tryFocus(retries);
  }, [scrollBehaviorMode]);

  const handleNavigate = useCallback((headingId: string) => {
    const headingIndex = outlineIndexById.get(headingId) ?? -1;
    setActiveId(headingId);
    if (mode === "edit" && setMode) {
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center gap-2 border-b border-border/40 px-3">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search headings..."
            aria-label="Search outline headings"
            className="h-8 rounded-md border border-transparent bg-transparent dark:bg-transparent pl-8 pr-8 text-sm shadow-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0"
          />
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          {query.length > 0 ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Clear outline search"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="h-4 w-px bg-border/60" aria-hidden="true" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(
              "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              disableOutlineControls && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
            )}
            aria-label="Expand all outline sections"
            onClick={handleExpandAll}
            disabled={disableOutlineControls}
          >
            <ChevronsDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              disableOutlineControls && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
            )}
            aria-label="Collapse all outline sections"
            onClick={handleCollapseAll}
            disabled={disableOutlineControls}
          >
            <ChevronsUp className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {!hasOutlineHeadings ? (
          <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
            No headings found in this file.
          </div>
        ) : filterActive && !hasVisibleOutline ? (
          <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
            No headings match your search.
          </div>
        ) : (
          <div className="space-y-0.5">
            {visibleTree.map((node) => (
              <OutlineTreeNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                activeId={activeId}
                filterActive={filterActive}
                onToggleNode={toggleNode}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OutlineTreeNode({
  node,
  depth,
  expanded,
  activeId,
  filterActive,
  onToggleNode,
  onNavigate,
}: {
  node: MarkdownOutlineNode;
  depth: number;
  expanded: Record<string, boolean>;
  activeId: string | null;
  filterActive: boolean;
  onToggleNode: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = hasChildren ? (filterActive ? true : (expanded[node.id] ?? true)) : false;
  const isActive = activeId === node.id;
  const connectorLeft = depth * NODE_INDENT_PX + CONNECTOR_LEFT_OFFSET_PX;
  const toggleDisabled = filterActive;

  return (
    <div className="space-y-0.5">
      <div className="group flex items-center rounded-md px-1 py-0.5 transition-colors hover:bg-muted/20">
        <div style={{ width: depth * NODE_INDENT_PX }} aria-hidden="true" />
        {hasChildren ? (
          <button
            type="button"
            className={cn(
              "mr-1 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              toggleDisabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
            )}
            aria-label={toggleDisabled ? `Expansion locked while searching: ${node.text}` : (isExpanded ? `Collapse ${node.text}` : `Expand ${node.text}`)}
            onClick={() => onToggleNode(node.id)}
            disabled={toggleDisabled}
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
                filterActive={filterActive}
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

type FilterOutlineResult = {
  tree: MarkdownOutlineNode[];
  includedIds: Set<string>;
  matchedIds: Set<string>;
};

function filterOutlineTree(nodes: MarkdownOutlineNode[], normalizedQuery: string): FilterOutlineResult {
  const includedIds = new Set<string>();
  const matchedIds = new Set<string>();

  if (!normalizedQuery) {
    for (const node of nodes) {
      collectNodeIds(node, includedIds);
    }
    return { tree: nodes, includedIds, matchedIds };
  }

  const filterNode = (node: MarkdownOutlineNode): MarkdownOutlineNode | null => {
    const matchesSelf = node.text.toLowerCase().includes(normalizedQuery);
    if (matchesSelf) {
      matchedIds.add(node.id);
      const cloned = cloneOutlineSubtree(node);
      collectNodeIds(cloned, includedIds);
      return cloned;
    }

    const filteredChildren = node.children
      .map((child) => filterNode(child))
      .filter((child): child is MarkdownOutlineNode => child !== null);
    if (filteredChildren.length === 0) {
      return null;
    }

    includedIds.add(node.id);
    return {
      ...node,
      children: filteredChildren,
    };
  };

  const tree = nodes
    .map((node) => filterNode(node))
    .filter((node): node is MarkdownOutlineNode => node !== null);

  return { tree, includedIds, matchedIds };
}

function cloneOutlineSubtree(node: MarkdownOutlineNode): MarkdownOutlineNode {
  return {
    ...node,
    children: node.children.map((child) => cloneOutlineSubtree(child)),
  };
}

function collectNodeIds(node: MarkdownOutlineNode, ids: Set<string>): void {
  ids.add(node.id);
  for (const child of node.children) {
    collectNodeIds(child, ids);
  }
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
