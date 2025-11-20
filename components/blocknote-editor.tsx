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

	const editor = useCreateBlockNote({
		initialContent: value ? undefined : [],
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

	// Register editor with store
	useEffect(() => {
		if (editor) {
			registerEditorView(editor as any);
		}
		return () => {
			registerEditorView(null);
		};
	}, [editor, registerEditorView]);

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
		<BlockNoteView
			editor={editor}
			onChange={handleChange}
			className={className}
		/>
	);
}
