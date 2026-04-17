# Progress

Current issue: `docs/issues/issue-30.md`

Current section: Chore — react-resizable-panels v4 Migration

Previous tasks (latest completed batch only):
- [x] Upgraded `react-resizable-panels` from v3.0.6 to v4.10.0.
- [x] Updated `components/ui/resizable.tsx` wrapper to use v4 API (`PanelGroup` → `Group`, `PanelResizeHandle` → `Separator`).
- [x] Kept wrapper's external API unchanged — no consumer code changes needed.
- [x] Fixed dead CSS selectors: replaced `data-[panel-group-direction=vertical]` with `group-data-[orientation=vertical]/resizable` pattern using Tailwind `group/resizable` + `data-orientation`.
- [x] Verified lint and build pass.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `chore/1776424218-react-resizable-panels-v4`
- Wrapper component is not currently used in the codebase, making this a zero-risk migration.
- v4 renames: `PanelGroup` → `Group`, `PanelResizeHandle` → `Separator`, `direction` → `orientation`.
