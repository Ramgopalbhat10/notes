"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, Clock, ListTree, X } from "lucide-react";

import { MarkdownOutlinePanel } from "@/components/outline/markdown-outline-panel";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeReadingTimeLabel } from "@/lib/reading-time";
import { cn } from "@/lib/utils";

type PublicFileViewProps = {
  fileKey: string;
  title: string;
  lastUpdated: string | null;
  content: string;
};

export function PublicFileView({ fileKey, title, lastUpdated, content }: PublicFileViewProps) {
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [desktopFabLeft, setDesktopFabLeft] = useState(16);
  const articleRef = useRef<HTMLElement>(null);
  const readingTime = computeReadingTimeLabel(content);
  const updateDesktopFabPosition = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const article = articleRef.current;
    if (!article) {
      return;
    }

    const rect = article.getBoundingClientRect();
    const fabSize = 36;
    const viewportPadding = 16;
    const gapFromArticle = 16;
    const preferredLeft = rect.right + gapFromArticle;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - viewportPadding - fabSize);
    const clampedLeft = Math.min(Math.max(preferredLeft, viewportPadding), maxLeft);
    setDesktopFabLeft(Math.round(clampedLeft));
  }, []);

  useLayoutEffect(() => {
    updateDesktopFabPosition();
  }, [updateDesktopFabPosition]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      updateDesktopFabPosition();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateDesktopFabPosition]);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateDesktopFabPosition();
    });
    observer.observe(article);
    return () => {
      observer.disconnect();
    };
  }, [updateDesktopFabPosition]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const desktopMediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleDesktopTransition = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileOutlineOpen(false);
      }
    };

    if (desktopMediaQuery.matches) {
      setMobileOutlineOpen(false);
    }

    desktopMediaQuery.addEventListener("change", handleDesktopTransition);
    return () => {
      desktopMediaQuery.removeEventListener("change", handleDesktopTransition);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <main className="flex-1 min-w-0" style={{ fontFamily: "var(--font-onest, system-ui)" }}>
        <article ref={articleRef} className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-16">
          <header className="mb-8 text-center md:text-left">
            <div className="space-y-2">
              <h1
                className="text-3xl font-semibold tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-roboto-serif, ui-serif)" }}
              >
                {title}
              </h1>
              {lastUpdated ? (
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground md:justify-start md:text-base">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {lastUpdated}
                  </span>
                  <span className="text-border" aria-hidden>·</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {readingTime}
                  </span>
                </div>
              ) : null}
            </div>
          </header>

          <MarkdownPreview content={content} parseIncompleteMarkdown={false} className="public-view" />
        </article>
      </main>

      {/* Desktop Outline Sidebar */}
      <aside
        className={cn(
          "pointer-events-none fixed inset-y-0 right-0 z-30 hidden w-96 border-l border-border/40 bg-background shadow-xl transition-transform duration-300 ease-in-out lg:block",
          outlineOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full"
        )}
        aria-hidden={!outlineOpen}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="flex h-10 items-center justify-between border-b border-border/40 px-4">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Outline</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOutlineOpen(false)}
              aria-label="Close outline"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="h-[calc(100vh-2.5rem)] overflow-y-auto">
            <MarkdownOutlinePanel
              content={content}
              contextKey={`public-desktop:${fileKey}`}
              scrollBehaviorMode="instant"
            />
          </div>
        </div>
      </aside>

      {/* Mobile Toggle FAB */}
      <div className="fixed right-4 bottom-4 z-40 lg:hidden">
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 rounded-full border border-border/50 bg-background/95 text-foreground shadow"
          onClick={() => setMobileOutlineOpen((prev) => !prev)}
          aria-label="Toggle outline"
        >
          <ListTree className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop Toggle FAB (always visible) */}
      <div className="fixed bottom-4 z-40 hidden lg:block" style={{ left: `${desktopFabLeft}px` }}>
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 rounded-full border border-border/50 bg-background/95 text-foreground shadow"
          onClick={() => setOutlineOpen((prev) => !prev)}
          aria-label={outlineOpen ? "Close outline" : "Open outline"}
        >
          <ListTree className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Outline Sheet (controlled) */}
      <Sheet open={mobileOutlineOpen} onOpenChange={setMobileOutlineOpen}>
        <SheetContent side="right" className="!w-full !max-w-none gap-0 p-0 [&>button]:hidden">
          <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-border/40 px-3 py-2">
            <SheetTitle className="text-left text-xs font-semibold tracking-widest uppercase text-muted-foreground">Outline</SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Close outline"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="h-[calc(100vh-2.625rem)] overflow-y-auto p-0">
            <MarkdownOutlinePanel
              content={content}
              contextKey={`public-mobile:${fileKey}`}
              scrollBehaviorMode="instant"
              onNavigateToSection={() => setMobileOutlineOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
