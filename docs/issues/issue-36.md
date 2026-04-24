# Issue 36 — Fix Assistant Sidebar Responsive Layout

## Type
- fix

## Status
- resolved

## Related Story
- None

## Description
- The assistant sidebar does not expose the compare-with-original action on mobile. At tablet viewport widths, the right sidebar sheet renders as a narrow panel floating inside the viewport instead of using the available width.

## Root Cause
- Assistant compare mode was gated behind a `min-width: 1024px` media query even though the compare layout is now a vertical split that can work on narrow screens. The right mobile sheet also kept tablet-width classes while the desktop sidebar only appears at `lg`, causing the sheet content to shrink at `md` sizes.

## Fix / Approach
- Remove the desktop-only compare gate so the compare action and original-note split are available on mobile and tablet.
- Keep the right sheet full width for all viewports below the desktop sidebar breakpoint.

## Files Changed
- `components/ai-actions/sidebar-assistant.tsx`
- `components/ai-actions/assistant-draft-card.tsx`
- `components/app-shell.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-24 | fix | Started responsive assistant sidebar fix for mobile compare and tablet sheet width. |
| 2026-04-24 | fix | Removed the desktop-only compare gate, kept the right sheet full width below `lg`, and verified lint/build. |

## Test Plan
- Manual: at mobile width, trigger an assistant draft and verify the compare-with-original button is visible and toggles the original note.
- Manual: at tablet width, open the assistant sidebar and verify it uses the available sheet width instead of floating as a narrow column.
- `pnpm lint` and `pnpm build` pass.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- User screenshots showing missing mobile compare action and narrow tablet assistant sidebar.
