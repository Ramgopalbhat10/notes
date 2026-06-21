# Issue 41 — Quick Switcher Uses Lighter Translucent Styling Instead of Shortcuts Dialog

## Type
- bug

## Status
- resolved

## Related Story
- Story 24 — Quick Switcher & Command Palette

## Description
- The Quick Switcher dialog uses a translucent `bg-popover/95` background with `backdrop-blur`, while the Shortcuts dialog uses a solid `bg-background` with a full `border-border`. The Quick Switcher therefore appears visually lighter/duller and inconsistent with the rest of the app's modal chrome.

## Root Cause
- The `CommandDialog` wrapper in `components/quick-switcher.tsx` sets `contentClassName="max-w-2xl border-border/70 bg-popover/95 p-0 backdrop-blur"`. The Shortcuts component (`components/app-shortcuts.tsx`) uses a solid background (`bg-background`) and full border (`border-border`) via `DialogContent`.

## Fix / Approach
- Update the Quick Switcher `contentClassName` to match the solid styling of the Shortcuts dialog:
  - `bg-popover/95` → `bg-background`
  - `border-border/70` → `border-border`
  - Remove `backdrop-blur`
  - Add `gap-0 overflow-hidden` for layout parity.

## Files Changed
- `components/quick-switcher.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-06-21 | fix | Align Quick Switcher dialog background/border with Shortcuts dialog |

## Test Plan
- Open Quick Switcher (`Cmd/Ctrl + K`) and Shortcuts dialog (`Cmd/Ctrl + ?`) side-by-side; confirm matching solid background and border.
- Verify no visual regression in Quick Switcher item list or scroll behavior.
- Run `pnpm lint` and `pnpm build`.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- Story 24 — Quick Switcher & Command Palette
