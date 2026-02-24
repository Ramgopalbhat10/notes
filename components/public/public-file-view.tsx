"use client";

import { useState } from "react";
import { ListTree, X } from "lucide-react";

import { MarkdownOutlinePanel } from "@/components/outline/markdown-outline-panel";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type PublicFileViewProps = {
  fileKey: string;
  title: string;
  lastUpdated: string | null;
  content: string;
};

export function PublicFileView({ fileKey, title, lastUpdated, content }: PublicFileViewProps) {
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <main className="flex-1 min-w-0">
        <article className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-16">
          <header className="mb-8 text-center md:text-left">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
              {lastUpdated ? (
                <p className="text-sm text-muted-foreground md:text-base">Last updated {lastUpdated}</p>
              ) : null}
            </div>
          </header>

          <MarkdownPreview content={content} parseIncompleteMarkdown={false} />
        </article>
      </main>

      {/* Desktop Outline Sidebar */}
      <aside
        className={cn(
          "hidden border-l border-border/40 bg-background transition-all duration-300 ease-in-out lg:block",
          outlineOpen ? "w-80" : "w-0 border-l-0 overflow-hidden"
        )}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
            <h2 className="text-sm font-medium">Outline</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOutlineOpen(false)}
              aria-label="Close outline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
            <MarkdownOutlinePanel
              content={content}
              contextKey={`public-desktop:${fileKey}`}
              scrollBehaviorMode="instant"
            />
          </div>
        </div>
      </aside>

      {/* Mobile Toggle & Sheet */}
      <div className="fixed bottom-4 right-4 lg:hidden">
        <Sheet open={mobileOutlineOpen} onOpenChange={setMobileOutlineOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full border border-border/50 bg-background/95 text-foreground shadow"
            >
              <ListTree className="h-4 w-4" />
              <span className="sr-only">Toggle outline</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="!w-full !max-w-none gap-0 p-0 [&>button]:hidden">
            <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-border/40 px-3 py-2">
              <SheetTitle className="text-left text-sm">Outline</SheetTitle>
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

      {/* Desktop Toggle Button (Only visible when closed) */}
      {!outlineOpen && (
        <div className="fixed bottom-4 right-4 hidden lg:block">
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-full border border-border/50 bg-background/95 text-foreground shadow"
            onClick={() => setOutlineOpen(true)}
            aria-label="Open outline"
          >
            <ListTree className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
