# Progress

Current story: `docs/stories/story-30.md`

Current section: Story 30.3 — Verification and Regression Checks

Previous tasks (latest completed batch only):
- [x] Add shared move-destination helpers and store-side validation.
- [x] Render a folder picker in the Move dialog and submit the selected parent id.
- [x] Wire HTML5 drag-and-drop on sidebar rows with destination highlighting.
- [x] Auto-expand a closed folder after hovering it during a drag.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.

Next tasks:
- [ ] Manually verify dialog picker, sidebar drag-and-drop, and existing tree actions.

Notes:
- Branch: `cursor/move-folder-tree-dnd-a9b0`
- `pnpm lint` passed. `pnpm build` compiled and typechecked; page-data collection needs vault env secrets in this agent VM.
- Drag-and-drop uses HTML5 (no new dependency). Nested drop targets must `stopPropagation` or drops fall through to Vault root.
