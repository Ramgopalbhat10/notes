# Progress

Current story: `docs/stories/story-23.md`

Current section: Story 23.4 — Verification and Regression Checks

Previous tasks (latest completed batch only):
- [x] Fixed the preview-origin apply path so preview anchors are resolved before any edit-mode block fallback can replace the whole document or insert at cursor/EOF.
- [x] Added a hard chunk-plan cap so one `/api/ai/action` request cannot fan out into unbounded sequential model calls.
- [x] Re-ran `pnpm lint`.
- [x] Re-ran `pnpm build`.

Next tasks:
- [ ] Manually verify edit-mode and preview-mode selection actions once an authenticated `/files` session is available.
- [ ] Manually verify desktop vs tablet/mobile AI entry placement and compare behavior once an authenticated `/files` session is available.
- [ ] Manually verify assistant reopen-without-rerun behavior for document and selection actions once an authenticated `/files` session is available.

Notes:
- Branch: `feature/ai-actions-sidebar-workspace`
- This story builds on the existing AI actions, chat, and outline sidebar work in Stories 4, 5, 17, and 18.
- Browser-level manual verification is still pending even though lint/build passed; local app access redirects to `/auth/sign-in` without an available workspace session.
