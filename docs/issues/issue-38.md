# Issue 38 — Right Sidebar Equal-Width Expansion and Resizable Drag Handle

## Type
- bug

## Status
- resolved

## Related Story
- Story 5 — AI Chat (Right Sidebar)

## Description
- The right sidebar, when expanded via the Maximize button, takes up half the screen (`50vw`). Because the left sidebar also occupies space, the main content area ends up narrower than the right sidebar. The user expects the main content and right sidebar to be equal in width after expansion.
- Additionally, there is no way to resize the right sidebar interactively; width changes are only possible via the Expand/Shrink toggle.

## Root Cause
- The expanded width was hardcoded to `50vw` in both the Tailwind width class (`w-1/2`) and the inline style, without accounting for the left sidebar width.
- No drag-to-resize handle existed on the sidebar.

## Fix / Approach
- Replaced the discrete `w-0 / w-[30rem] / w-1/2` width model with a pixel-precise `rightSidebarWidthPx` state in the Zustand layout store.
- The Expand button now computes `(viewportWidth - leftSidebarWidth) / 2` so the main content and right sidebar share the remaining space equally.
- Added a 4px drag handle on the left edge of the right sidebar with min (320px) and dynamic max (viewport - left - 45% main) constraints.
- Implemented a custom `useRightSidebarResize` hook that mutates DOM width directly during drag for 60fps, then commits the final width to the store on mouseup.
- CSS transitions are disabled during drag to avoid jank.

## Files Changed
- `stores/layout.ts`
- `components/app-shell.tsx`
- `components/app-shell/sections/right-desktop-sidebar.tsx`
- `components/app-shell/sections/sidebar-auto-collapse.tsx`
- `components/app-shell/hooks/use-right-sidebar-resize.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-05-18 | fix | Added pixel-precise width state, equal-split expansion math, and draggable resize handle for the right sidebar |

## Test Plan
- Open the right sidebar and click Expand — verify main content and sidebar are equal width.
- Drag the left edge of the sidebar — verify smooth resizing with min/max limits.
- Click Shrink — verify sidebar returns to default 30rem width.
- Run `pnpm lint` and `pnpm build` — both must pass.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- Story 5: `docs/stories/story-5.md`
