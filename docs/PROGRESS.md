# Progress

Current issue: `docs/issues/issue-42.md`

Current section: Issue 42 — Next.js 16.3 Instant Navigations Adaptation

Previous tasks (latest completed batch only):
- [x] Bump `next` + ESLint packages to `16.3.0-preview.5` in `package.json`
- [x] Enable `partialPrefetching` in `next.config.ts`
- [x] Add `export const instant = false` to redirect pages
- [x] Run `pnpm install` to update lockfile
- [x] Run `pnpm lint` and `pnpm build`
- [x] Commit, push, and create PR
- [x] Tie `partialPrefetching` to `cacheComponents` env guard (Codex review fix)
- [x] Isolate `connection()` in DynamicMarker to prevent workspace remount on navigation

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `chore/next-16-3-instant-navigations`
- 16.3 is currently a Preview release (`preview` dist-tag = `16.3.0-preview.5`); stable not yet published.
- Lint + build pass on 16.3.0-preview.5. Both redirect pages prerender as Static (○); `/files` and `/p` routes remain Partial Prerender (◐).
- Renumbered from Issue 41 to Issue 42 due to collision with Quick Switcher fix (PR #115) merged to main.
- PR #116 (merged): initial 16.3 adoption + partialPrefetching env guard fix.
- PR #117: DynamicMarker fix — moved `connection()` into isolated Suspense boundary with null fallback so children no longer remount on file navigation.
