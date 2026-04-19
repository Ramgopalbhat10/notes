# Issue 34 — Redesign Markdown Table Rendering Styles

## Type
- refactor

## Status
- open

## Related Story
- None

## Description
- Markdown tables rendered by Streamdown in the main note view look out of sync with the rest of the app's design language. The outer wrapper keeps Streamdown's default `bg-sidebar` surface while the inner table container is overridden with a different muted/background mix, so the action bar (copy / download / fullscreen) appears as a distinct dark strip that does not match the table body or any other markdown surface (code blocks, mermaid blocks, cards). Header cells, row dividers, and the duplicated outer-vs-inner borders also feel heavy compared to the subtle shadcn-style borders used elsewhere.

## Root Cause
- `app/globals.css` only overrides `[data-streamdown="table-wrapper"] > div:last-child` (the inner scroll container). The outer wrapper retains Streamdown's default classes (`rounded-lg border bg-sidebar p-2`), creating two stacked surfaces with different background tokens. Table cells use `border-b border-r border-border/60`, `bg-popover` for `th`, and `bg-card` for `[data-streamdown="table-row"]`, which produces a denser, more "grid-like" look than the rest of the UI.

## Fix / Approach
- Collapse the table into a single rounded card container that matches the app's design tokens (muted/card surface + `border-border/60`), and align visuals with sibling markdown surfaces (code-block, mermaid-block).
- Style the Streamdown action row as a subtle header strip with a light bottom divider, not a separate dark bar.
- Target Streamdown's semantic `data-streamdown` attributes (`table-header`, `table-header-cell`, `table-body`, `table-row`, `table-cell`) for precise, future-proof selectors instead of generic `th/td`/`:last-child` rules.
- Keep only horizontal row dividers, remove vertical cell borders, and use a subtle header background plus uppercase tracking for `th`, matching the rest of the app's typography rhythm.
- Preserve public view and assistant variants.

## Files Changed
- `app/globals.css`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-19 | refactor | Rewrote `.markdown-preview` table styles to a single themed surface and removed Streamdown's default `bg-sidebar` outer wrapper. |

## Test Plan
- `pnpm lint` passes.
- `pnpm build` passes.
- Manually inspect a note with a markdown table in both light and dark modes to confirm the container, header, and body share one consistent theme surface with subtle borders and row dividers, and that the copy / download / fullscreen actions align cleanly at the top right without a darker strip.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- User screenshot showing the mismatched dark strip above the table on the main note view.
- Streamdown source for table wrapper structure: `node_modules/streamdown/dist/chunk-BO2N2NFS.js` — outer wrapper uses `rounded-lg border border-border bg-sidebar p-2` and exposes `data-streamdown="table-wrapper|table-header|table-header-cell|table-body|table-row|table-cell"`.
