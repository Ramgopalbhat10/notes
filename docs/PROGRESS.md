# Progress

Current issue: `docs/issues/issue-34.md`

Current section: Issue 34 — Redesign Markdown Table Rendering Styles

Previous tasks (latest completed batch only):
- [x] Authored `docs/issues/issue-34.md` and registered it in `docs/issues/README.md`.
- [x] Rewrote `.markdown-preview` table styles in `app/globals.css` to use a single themed surface targeting Streamdown's `data-streamdown` attributes.
- [x] Ran `pnpm lint` and `pnpm build` — both pass.

Next tasks:
- [ ] Commit on `refactor/markdown-table-styles` and open a PR.

Notes:
- Branch: `refactor/markdown-table-styles`
- Outer wrapper now uses one `rounded-[var(--radius)] border-border/60` card with a `muted/background` mix; the Streamdown action row is a subtle header strip with a hairline divider; cells use horizontal row dividers only and a subtle hover state.
