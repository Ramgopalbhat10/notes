# Progress

Current issue: `docs/issues/issue-34.md`

Current section: Issue 34 — Redesign Markdown Table Rendering Styles (iteration 2)

Previous tasks (latest completed batch only):
- [x] Authored `docs/issues/issue-34.md` and registered it in `docs/issues/README.md`.
- [x] Rewrote `.markdown-preview` table styles in `app/globals.css` to use a single themed surface targeting Streamdown's `data-streamdown` attributes.
- [x] Moved Streamdown table/code-block/mermaid overrides out of `@layer components` to beat Tailwind v4 utility-layer classes (`bg-sidebar`, `divide-y`, `sticky`, `-mt-10`, etc.).
- [x] Collapsed table into a single background surface (header-row is the only tinted row); removed per-row gutters from `divide-y`.
- [x] Docked code-block / mermaid action icons into a dedicated header strip instead of Streamdown's floating `sticky top-2 -mt-10` pill.
- [x] Ran `pnpm lint` and `pnpm build` — both pass.

Next tasks:
- [ ] Push iteration-2 commit to `refactor/markdown-table-styles`, update PR #106, wait for CI.
- [ ] Verify fixes live on the Vercel preview (tables, code block + mermaid action icons, centered-layout behavior on file switch).

Notes:
- Branch: `refactor/markdown-table-styles` — PR #106.
- The previous iteration placed overrides inside `@layer components`; Streamdown's utility-layer classes beat them regardless of selector specificity, which reintroduced the two-surface look, per-row backgrounds, and floating action pill.
