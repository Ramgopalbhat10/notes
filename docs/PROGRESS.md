# Progress

Current story: `docs/stories/story-30.md`

Current section: Story 30.3 — Verification and Regression Checks

Previous tasks (latest completed batch only):
- [x] Highlight Vault root as a drop target without inserting a layout-shifting row.

Next tasks:
- [ ] Manually verify dialog picker, sidebar drag-and-drop, and existing tree actions.

Notes:
- Branch: `cursor/move-folder-tree-dnd-a9b0`
- PR: https://github.com/Ramgopalbhat10/notes/pull/125
- `pnpm lint` passed. `pnpm build` compiled and typechecked with dummy env in this agent VM.
- Nested drop targets must `stopPropagation` or drops fall through to Vault root.
