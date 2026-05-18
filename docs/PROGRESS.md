# Progress

Current issue: `docs/issues/issue-37.md`

Current section: Issue 37 — Right Sidebar Equal-Width Expansion and Resizable Drag Handle

Previous tasks (latest completed batch only):
- [x] Replaced discrete width model with pixel-precise `rightSidebarWidthPx` state
- [x] Fixed Expand button to compute `(viewport - leftSidebar) / 2` for equal split
- [x] Added draggable resize handle with 320px min and dynamic max constraints
- [x] Ran `pnpm lint` and `pnpm build` — both passed

Next tasks:
- [ ] Manual smoke test after PR merge: expand/shrink, drag resize, close/reopen

Notes:
- Branch: `fix/right-sidebar-resize`
