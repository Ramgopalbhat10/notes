# Progress

Current issue: `docs/issues/issue-34.md`

Current section: Issue 34 — Redesign Markdown Table Rendering Styles (iteration 3)

Previous tasks (latest completed batch only):
- [x] Iteration 2: moved Streamdown table/code-block/mermaid overrides out of `@layer components` (unlayered bucket) to beat Tailwind v4 utility-layer classes.
- [x] Verified live on local dev (fix branch, `AUTH_BYPASS=true`): S1 table single-surface, S2 code-block icons docked, S3 mermaid icons docked — all pass via visual + console hard-assertions.
- [x] Iteration 3: fixed centered-layout regression — `useWorkspaceSettingsSync` now bootstraps the layout store exactly once on first `settingsInitialized=true`, instead of re-asserting the server value on every settings-related dep change. Prevents header-toggle state from being clobbered on file switch.
- [x] Ran `pnpm lint` and `pnpm build` — both pass.

Next tasks:
- [ ] Push iteration-3 commit to `refactor/markdown-table-styles`, update PR #106, wait for CI.
- [ ] Re-enter test mode to verify S4 (centered layout persists on file switch) end-to-end and post final PR comment with all four scenarios.

Notes:
- Branch: `refactor/markdown-table-styles` — PR #106.
- The previous iteration placed overrides inside `@layer components`; Streamdown's utility-layer classes beat them regardless of selector specificity, which reintroduced the two-surface look, per-row backgrounds, and floating action pill.
