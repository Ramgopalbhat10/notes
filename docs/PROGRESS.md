# Progress

Current issue: `docs/issues/issue-41.md`

Current section: Issue 41 — Next.js 16.3 Instant Navigations Adaptation

Previous tasks (latest completed batch only):
- [x] Bump `next` + ESLint packages to `16.3.0-preview.5` in `package.json`
- [x] Enable `partialPrefetching` in `next.config.ts`
- [x] Add `export const instant = false` to redirect pages
- [x] Run `pnpm install` to update lockfile
- [x] Run `pnpm lint` and `pnpm build`

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `chore/next-16-3-instant-navigations`
- 16.3 is currently a Preview release (`preview` dist-tag = `16.3.0-preview.5`); stable not yet published.
- Lint + build pass on 16.3.0-preview.5. Both redirect pages prerender as Static (○); `/files` and `/p` routes remain Partial Prerender (◐).
