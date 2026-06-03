# Issue 39 — Duplicate Recent Entries and Close Button Misalignment in Quick Switcher

## Type
- bug

## Status
- resolved

## Related Story
- Story 24 — Quick Switcher

## Description
- Moving back and forth between files caused duplicate entries to show in the "Recent" section of the global search/quick switcher component.
- The close (X) button on the search dialog was misaligned and too low relative to the search input text and icons.

## Root Cause
- The `recentItems` calculation in the quick switcher iterated backwards over the selection history but did not filter out duplicate IDs, meaning files were duplicated in the list.
- The standard dialog close button is positioned with `top-4` (16px), which works for headers, but since `CommandDialog`'s top element is `CommandInput` which is `44px` tall, a `24px` tall close button needs a `10px` top offset to be perfectly vertically centered (`(44 - 24) / 2 = 10px`).

## Fix / Approach
- Added a `Set` to track visited file IDs inside the `recentItems` `useMemo` of `components/quick-switcher.tsx` and skipped duplicate IDs while keeping the most recent occurrences. This aligns with modern note-taking apps like Notion and Obsidian.
- Positioned the close button in `CommandDialog` in `components/ui/command.tsx` using `[&>button]:top-[10px]` to center it vertically.

## Files Changed
- `components/quick-switcher.tsx`
- `components/ui/command.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-06-03 | fix | Deduplicated quick switcher history and centered close button vertically |

## Test Plan
- Verify only unique files are shown in the recent files section, with the most recently visited file at the top.
- Verify the close (X) icon is centered with the search bar.
- Run `pnpm lint` and `pnpm build` to verify correctness.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- Story 24: `docs/stories/story-24.md`
