# Progress

Current story: `docs/stories/story-21.md`

Current section: Story 21.10 — Desktop Outline Overlay Without Content Shift

Previous tasks (latest completed batch only):
- [x] Converted desktop outline panel to fixed right overlay slide-in/out so main content does not shift.
- [x] Stabilized desktop FAB position during outline toggle by removing toggle-time reposition updates.
- [x] Ran quality gate commands (`pnpm lint`, `pnpm build`) successfully.
- [x] Completed manual desktop UX checks (no content shift, no icon jitter during outline toggle).
- [x] Completed viewport manual checks at `320`, `375`, `425`, `768`, and `1024+` for wrapping/list behavior.

Next tasks:
- None - all tasks completed.

Notes:
- Scope guard: all layout/wrapping fixes must stay constrained to public route rendering (`MarkdownPreview` class `public-view` and `PublicFileView` desktop FAB container logic).
