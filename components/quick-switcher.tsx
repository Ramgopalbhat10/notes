"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePlus2, FileText, FolderPlus } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { basename } from "@/lib/platform/paths";
import type { NodeId } from "@/stores/tree";
import { useTreeStore } from "@/stores/tree";

type QuickSwitcherProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFile: (parentId: NodeId | null) => void;
  onCreateFolder: (parentId: NodeId | null) => void;
};

type FileEntry = {
  id: NodeId;
  name: string;
  path: string;
  normalizedSearchText: string;
};

type FileGroup = {
  key: string;
  label: string;
  items: FileEntry[];
};

const RECENT_LIMIT = 8;

export function QuickSwitcher({
  open,
  onOpenChange,
  onCreateFile,
  onCreateFolder,
}: QuickSwitcherProps) {
  const nodes = useTreeStore((state) => state.nodes);
  const rootIds = useTreeStore((state) => state.rootIds);
  const viewHistory = useTreeStore((state) => state.viewHistory);
  const selectedId = useTreeStore((state) => state.selectedId);
  const select = useTreeStore((state) => state.select);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();

  const fileEntries = useMemo<FileEntry[]>(() => {
    return Object.values(nodes)
      .filter((node): node is typeof node & { type: "file" } => node.type === "file")
      .map((node) => ({
        id: node.id,
        name: node.name,
        path: node.path,
        normalizedSearchText: node.normalizedSearchText,
      }));
  }, [nodes]);

  const fileEntryById = useMemo(() => {
    return new Map(fileEntries.map((entry) => [entry.id, entry] as const));
  }, [fileEntries]);

  const recentItems = useMemo(() => {
    const items: FileEntry[] = [];

    for (const id of [...viewHistory].reverse()) {
      const entry = fileEntryById.get(id);
      if (!entry) {
        continue;
      }
      if (normalizedQuery.length > 0 && !entry.normalizedSearchText.includes(normalizedQuery)) {
        continue;
      }

      items.push(entry);
      if (items.length >= RECENT_LIMIT) {
        break;
      }
    }

    return items;
  }, [fileEntryById, normalizedQuery, viewHistory]);

  const groupedFiles = useMemo<FileGroup[]>(() => {
    const topLevelLabels = new Map<string, string>();
    const orderedGroupKeys: string[] = [];

    for (const rootId of rootIds) {
      const node = nodes[rootId];
      if (!node || node.type !== "folder") {
        continue;
      }

      const key = node.path.replace(/\/$/, "");
      if (!topLevelLabels.has(key)) {
        topLevelLabels.set(key, node.name);
        orderedGroupKeys.push(key);
      }
    }

    const buckets = new Map<string, FileEntry[]>();

    for (const entry of fileEntries) {
      if (normalizedQuery.length > 0 && !entry.normalizedSearchText.includes(normalizedQuery)) {
        continue;
      }

      const [topLevelSegment] = entry.path.split("/");
      const key = topLevelSegment || "__ungrouped__";
      const existing = buckets.get(key);

      if (existing) {
        existing.push(entry);
      } else {
        buckets.set(key, [entry]);
      }
    }

    const groups: FileGroup[] = [];

    for (const key of orderedGroupKeys) {
      const items = buckets.get(key);
      if (!items || items.length === 0) {
        continue;
      }

      groups.push({
        key,
        label: topLevelLabels.get(key) ?? key,
        items,
      });
      buckets.delete(key);
    }

    const ungroupedItems = buckets.get("__ungrouped__") ?? [];
    buckets.delete("__ungrouped__");

    for (const [key, items] of buckets) {
      if (items.length === 0) {
        continue;
      }

      groups.push({
        key,
        label: key,
        items,
      });
    }

    if (ungroupedItems.length > 0) {
      groups.push({
        key: "__ungrouped__",
        label: "Ungrouped",
        items: ungroupedItems,
      });
    }

    return groups;
  }, [fileEntries, nodes, normalizedQuery, rootIds]);

  const selectedFileParentId = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    const node = nodes[selectedId];
    return node?.type === "file" ? node.parentId : null;
  }, [nodes, selectedId]);

  const hasAnyFileResults = recentItems.length > 0 || groupedFiles.some((group) => group.items.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Quick switcher"
      description="Search for a note or create a new file or folder."
      contentClassName="max-w-2xl border-border/70 bg-popover/95 p-0 backdrop-blur"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Type a file name or path..."
      />
      <CommandList>
        {!hasAnyFileResults ? <CommandEmpty>No files match your search.</CommandEmpty> : null}

        <CommandGroup heading="Commands">
          <CommandItem
            value="new file"
            onSelect={() => {
              onOpenChange(false);
              onCreateFile(selectedFileParentId);
            }}
          >
            <FilePlus2 className="text-primary" />
            <span>New File</span>
            <CommandShortcut>Cmd/Ctrl+N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="new folder"
            onSelect={() => {
              onOpenChange(false);
              onCreateFolder(selectedFileParentId);
            }}
          >
            <FolderPlus className="text-primary" />
            <span>New Folder</span>
            <CommandShortcut>Shift+Cmd/Ctrl+N</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {recentItems.length > 0 ? (
          <>
            <CommandGroup heading="Recent">
              {recentItems.map((entry) => (
                <CommandItem
                  key={`recent-${entry.id}`}
                  value={`recent ${entry.name} ${entry.path}`}
                  onSelect={() => {
                    select(entry.id);
                    onOpenChange(false);
                  }}
                >
                  <FileText className="text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{basename(entry.path).replace(/\.md$/i, "")}</span>
                    <span className="truncate text-xs text-muted-foreground">{entry.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}

        {groupedFiles.map((group, index) => (
          <div key={group.key}>
            <CommandGroup heading={group.label}>
              {group.items.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={`${group.label} ${entry.name} ${entry.path}`}
                  onSelect={() => {
                    select(entry.id);
                    onOpenChange(false);
                  }}
                >
                  <FileText className="text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{basename(entry.path).replace(/\.md$/i, "")}</span>
                    <span className="truncate text-xs text-muted-foreground">{entry.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {index < groupedFiles.length - 1 ? <CommandSeparator /> : null}
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
