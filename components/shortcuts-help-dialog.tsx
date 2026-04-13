"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";

type ShortcutItem = {
  category: string;
  label: string;
  keys: string[];
};

const SHORTCUTS: ShortcutItem[] = [
  { category: "Global", label: "Toggle Left Sidebar", keys: ["Cmd/Ctrl", "B"] },
  { category: "Global", label: "Quick Switcher", keys: ["Cmd/Ctrl", "K"] },
  { category: "Global", label: "Toggle Chat Sidebar", keys: ["Cmd/Ctrl", "J"] },
  { category: "Global", label: "Save File", keys: ["Cmd/Ctrl", "S"] },
  { category: "File Tree", label: "Navigation", keys: ["Up", "Down", "Left", "Right"] },
  { category: "File Tree", label: "Open / Toggle", keys: ["Enter"] },
  { category: "File Tree", label: "Rename", keys: ["F2"] },
  { category: "File Tree", label: "Delete", keys: ["Cmd/Ctrl", "Backspace"] },
  { category: "File Tree", label: "New File", keys: ["Cmd/Ctrl", "N"] },
  { category: "File Tree", label: "New Folder", keys: ["Shift", "Cmd/Ctrl", "N"] },
  { category: "File Tree", label: "Move", keys: ["Shift", "Cmd/Ctrl", "M"] },
  { category: "Actions", label: "Export Markdown", keys: ["Cmd/Ctrl", "Shift", "E"] },
  { category: "Actions", label: "Copy Public Link", keys: ["Cmd/Ctrl", "Shift", "C"] },
];

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const [query, setQuery] = useState("");

  const filteredShortcuts = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      return SHORTCUTS;
    }

    return SHORTCUTS.filter((shortcut) =>
      shortcut.label.toLowerCase().includes(normalized)
      || shortcut.category.toLowerCase().includes(normalized),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, ShortcutItem[]> = {};

    for (const item of filteredShortcuts) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }

    const order = ["Global", "File Tree", "Actions", "Editor"];

    return Object.keys(groups)
      .sort((left, right) => {
        const leftIndex = order.indexOf(left);
        const rightIndex = order.indexOf(right);

        if (leftIndex !== -1 && rightIndex !== -1) {
          return leftIndex - rightIndex;
        }
        if (leftIndex !== -1) {
          return -1;
        }
        if (rightIndex !== -1) {
          return 1;
        }

        return left.localeCompare(right);
      })
      .map((category) => ({
        category,
        items: groups[category],
      }));
  }, [filteredShortcuts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[550px] gap-0 overflow-hidden border-border bg-background p-0 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="flex items-center border-b px-3 py-4">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-5 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search shortcuts..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <ScrollArea className="max-h-[300px] overflow-y-auto">
          <div className="p-3">
            {grouped.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No shortcuts found.
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.category} className="mb-4 last:mb-0">
                  <h4 className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    {group.category}
                  </h4>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/50"
                      >
                        <span className="text-foreground/90">{item.label}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key) => (
                            <Kbd key={`${item.label}-${key}`} className="text-xs">
                              {key}
                            </Kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
          <span>Use shortcuts to work faster</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
