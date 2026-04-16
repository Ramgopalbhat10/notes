# Issue 26 — CommandEmpty unreachable in Quick Switcher

## Type
- bug

## Status
- resolved

## Related Story
- `docs/stories/story-24.md`

## Description
- The `CommandEmpty` component at line 201 of `components/quick-switcher.tsx` is dead code. Because `CommandDialog` sets `shouldFilter={false}` on the cmdk `Command` component, cmdk counts all rendered `CommandItem` components to determine emptiness. The "Commands" group always renders 2 items ("New File" and "New Folder") regardless of the search query, so `filtered.count` is always ≥ 2 and `CommandEmpty` never fires. Users who search for a non-existent file see only the Commands group with no explanatory empty-state message.

## Root Cause
- `shouldFilter={false}` disables cmdk's built-in filtering but also means cmdk always counts every rendered `CommandItem`. Since the Commands group is unconditionally rendered with 2 items, the empty-state threshold (`filtered.count === 0`) is never reached.

## Fix / Approach
- Replace the `CommandEmpty` usage with a plain conditional div that renders the empty-state message when `!hasAnyFileResults` (already computed). This bypasses cmdk's item-counting logic entirely.

## Files Changed
- `components/quick-switcher.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-16 | fix | Replace unreachable CommandEmpty with conditional empty-state div |

## Test Plan
- Manual: open Quick Switcher, type a query that matches no files, verify the "No files match your search." message appears above the Commands group.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- PR #96 Devin Review comment: CommandEmpty is unreachable because the Commands group always renders items while shouldFilter={false}
