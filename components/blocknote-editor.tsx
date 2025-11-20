"use client";

import { useEffect } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { useEditorStore } from "@/stores/editor";

type BlockNoteEditorProps = {
	value: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
	className?: string;
};

export function BlockNoteEditor({ value, onChange, readOnly, className }: BlockNoteEditorProps) {
	const registerEditorView = useEditorStore((state) => state.registerEditorView);
	const setSelection = useEditorStore((state) => state.setSelection);

	const editor = useCreateBlockNote({
		initialContent: undefined,
	});

	// Load initial markdown content
	useEffect(() => {
		if (editor && value) {
			const loadContent = async () => {
				const blocks = await editor.tryParseMarkdownToBlocks(value);
				editor.replaceBlocks(editor.document, blocks);
			};
			loadContent();
		}
	}, [editor]);

	// Register editor with store and track selection
	useEffect(() => {
		if (editor) {
			registerEditorView(editor as any);

			// Track selection changes
			const handleSelectionChange = async () => {
				const selection = editor.getSelection();
				if (!selection) {
					setSelection(null);
					return;
				}

				// Get the selected blocks
				const blocks = selection.blocks;
				if (blocks.length === 0) {
					setSelection(null);
					return;
				}

				// Calculate character positions for the selection
				// We walk through all document blocks to find selection boundaries
				let from = 0;
				let to = 0;
				let currentPos = 0;
				let foundStart = false;
				let foundEnd = false;

				for (const block of editor.document) {
					const blockMarkdown = await editor.blocksToMarkdownLossy([block]);
					const blockLength = blockMarkdown.length;

					if (block.id === blocks[0].id) {
						from = currentPos;
						foundStart = true;
					}

					if (foundStart && !foundEnd) {
						to = currentPos + blockLength;
					}

					if (block.id === blocks[blocks.length - 1].id) {
						foundEnd = true;
						break;
					}

					currentPos += blockLength;
				}

				if (foundStart) {
					setSelection({ from, to });
				} else {
					setSelection(null);
				}
			};

			// Listen to selection changes
			editor.onSelectionChange(handleSelectionChange);

			// Set initial selection
			handleSelectionChange();
		}
		return () => {
			registerEditorView(null);
			setSelection(null);
		};
	}, [editor, registerEditorView, setSelection]);

	// Handle changes
	const handleChange = async () => {
		if (!editor) return;
		const markdown = await editor.blocksToMarkdownLossy(editor.document);
		onChange(markdown);
	};

	if (!editor) {
		return null;
	}

	return (
		<div className="flex-1 min-h-[calc(100vh-12rem)] w-full">
			<BlockNoteView
				editor={editor}
				onChange={handleChange}
				className={className}
			/>
		</div>
	);
}
