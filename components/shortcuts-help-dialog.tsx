"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type ShortcutItem = {
	category: string;
	label: string;
	keys: string[];
};

const SHORTCUTS: ShortcutItem[] = [
	{ category: "Global", label: "Toggle Left Sidebar", keys: ["⌘", "B"] },
	{ category: "Global", label: "Toggle Chat Sidebar", keys: ["⌘", "J"] },
	{ category: "Global", label: "Save File", keys: ["⌘", "S"] },
	{ category: "File Tree", label: "Navigation", keys: ["↑", "↓", "←", "→"] },
	{ category: "File Tree", label: "Open / Toggle", keys: ["Enter"] },
	{ category: "File Tree", label: "Rename", keys: ["F2"] },
	{ category: "File Tree", label: "Delete", keys: ["⌘", "⌫"] },
	{ category: "File Tree", label: "New File", keys: ["⌘", "N"] },
	{ category: "File Tree", label: "New Folder", keys: ["⇧", "⌘", "N"] },
	{ category: "File Tree", label: "Move", keys: ["⇧", "⌘", "M"] },
	{ category: "Actions", label: "Export Markdown", keys: ["⌘", "⇧", "E"] },
	{ category: "Actions", label: "Copy Public Link", keys: ["⌘", "⇧", "C"] },
];

interface ShortcutsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
	const [query, setQuery] = useState("");

	const filteredShortcuts = useMemo(() => {
		const q = query.toLowerCase().trim();
		if (!q) return SHORTCUTS;
		return SHORTCUTS.filter(
			(s) =>
				s.label.toLowerCase().includes(q) ||
				s.category.toLowerCase().includes(q)
		);
	}, [query]);

	const grouped = useMemo(() => {
		const groups: Record<string, ShortcutItem[]> = {};
		filteredShortcuts.forEach((item) => {
			if (!groups[item.category]) {
				groups[item.category] = [];
			}
			groups[item.category].push(item);
		});
		// Sort categories explicitly to keep Global first
		const orderedKeys = Object.keys(groups).sort((a, b) => {
			const order = ["Global", "File Tree", "Actions", "Editor"];
			const idxA = order.indexOf(a);
			const idxB = order.indexOf(b);
			if (idxA !== -1 && idxB !== -1) return idxA - idxB;
			if (idxA !== -1) return -1;
			if (idxB !== -1) return 1;
			return a.localeCompare(b);
		});
		return orderedKeys.map((key) => ({ category: key, items: groups[key] }));
	}, [filteredShortcuts]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="p-0 gap-0 max-w-[550px] overflow-hidden bg-background border-border shadow-2xl">
				<DialogHeader className="sr-only">
					<DialogTitle>Keyboard Shortcuts</DialogTitle>
				</DialogHeader>

				<div className="flex items-center border-b px-3 py-4">
					<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
					<input // Using native input for cleaner unstyled look matching command palette
						className="flex h-5 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
						placeholder="Search shortcuts..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
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
												className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent/50 transition-colors"
											>
												<span className="text-foreground/90">{item.label}</span>
												<div className="flex items-center gap-1">
													{item.keys.map((k, i) => (
														<Kbd key={i} className="text-xs">{k}</Kbd>
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

				<div className="flex items-center border-t bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground justify-between">
					<span>Use shortcuts to work faster</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}
