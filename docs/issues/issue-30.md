# Issue 30 — react-resizable-panels v4 Migration

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- Upgrade `react-resizable-panels` from v3.0.6 to v4.10.0.

## Root Cause
- v3 was behind the latest major release (v4) which includes flexible size constraints (pixels, percentages, REMs), improved server-rendering support, and bug fixes.

## Fix / Approach
- Installed `react-resizable-panels@4.10.0`.
- Updated `components/ui/resizable.tsx` wrapper to use v4 API:
  - `PanelGroup` → `Group`
  - `PanelResizeHandle` → `Separator`
  - `Panel` stays the same
- Kept the wrapper's external API (`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`) unchanged so no consumer code needs updating.
- Fixed dead CSS selectors: v4 no longer emits `data-panel-group-direction` attribute. Replaced with Tailwind `group/resizable` + `data-orientation` pattern:
  - `ResizablePanelGroup` sets `data-orientation` and `group/resizable` class
  - `ResizableHandle` uses `group-data-[orientation=vertical]/resizable:` selectors
  - Grip icon rotation moved to a direct class on the grip div
- The wrapper component is not currently used in the codebase, making this a zero-risk migration.

## Files Changed
- `package.json`
- `pnpm-lock.yaml`
- `components/ui/resizable.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-17 | chore | Upgraded react-resizable-panels v3→v4, updated wrapper component API |
| 2026-04-17 | fix | Fixed dead CSS selectors — replaced `data-[panel-group-direction=vertical]` with `group-data-[orientation=vertical]/resizable` pattern |

## Test Plan
- `pnpm lint` passes.
- `pnpm build` passes.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- [react-resizable-panels v3→v4 Migration Guide](https://github.com/bvaughn/react-resizable-panels/blob/main/CHANGELOG.md#migrating-from-version-3-to-4)
