# Progress

Current issue: `docs/issues/issue-34.md`

Current section: Issue 34 — Redesign Markdown Table Rendering Styles (iteration 4)

Previous tasks (latest completed batch only):
- [x] Iteration 2: moved Streamdown table/code-block/mermaid overrides out of `@layer components` (unlayered bucket) to beat Tailwind v4 utility-layer classes.
- [x] Verified live on local dev (fix branch, `AUTH_BYPASS=true`): S1 table single-surface, S2 code-block icons docked, S3 mermaid icons docked — all pass via visual + console hard-assertions.
- [x] Iteration 3: first attempt at centered-layout regression fix using `useRef(false)` as one-shot bootstrap gate. Verified live and **failed** — `files/[[...path]]/layout.tsx` wraps children in `<Suspense>` + `await connection()`, which remounts the workspace tree on every file switch and resets the component-scoped ref, re-firing the bootstrap with the stale server value.
- [x] Iteration 4: lifted the bootstrap flag from `useRef` to **module-scope** `let bootstrapped = false`. Survives Suspense remount. Verified live end-to-end: S4.0–S4.5 all pass (toggle ON persists across three file switches, toggle OFF also works, header toggle state no longer clobbered).
- [x] Ran `pnpm lint` — passes.

Next tasks:
- [ ] Push iteration-4 commit to `refactor/markdown-table-styles`, update PR #106, wait for CI.
- [ ] Post final PR comment with test-report.md summarising S1–S4 + S6 results.

Notes:
- Branch: `refactor/markdown-table-styles` — PR #106.
- The previous iteration placed overrides inside `@layer components`; Streamdown's utility-layer classes beat them regardless of selector specificity, which reintroduced the two-surface look, per-row backgrounds, and floating action pill.
