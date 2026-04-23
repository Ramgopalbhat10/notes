# Progress

Current issue: `docs/issues/issue-35.md`

Current section: Issue 35 — Tighten Assistant Refine Panel Chrome

Previous tasks (latest completed batch only):
- [x] Restored safe-area bottom padding to the assistant composer footer.
- [x] Kept desktop footer alignment by using `min-h-11` with safe-area-aware bottom padding.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `fix/assistant-refine-panel-annotations`
- Browser annotation request on `/files/welcome`: remove assistant context/status helper chrome, reduce input height, remove the bottom kbd shortcut hint, fill the draft card height, avoid focus border changes on the input, move draft actions out of the preview body's vertical flow, replace cramped side-by-side compare with a vertical resizable split, make the composer a single compact row, remove the composer's inner border frame, normalize compact compare typography, and restore mobile safe-area padding.
- PR review follow-up: addressed Codex review thread requesting safe-area inset restoration for the assistant composer footer.
