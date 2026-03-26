# Issue 20 — Next.js 16.2 Upgrade Verification & Runtime Alignment

## Type
- refactor

## Status
- resolved

## Related Story
- None

## Description
- Upgrade the repo from `next@16.0.7` to `16.2.x` and verify that the existing Next 16 migration remains correct with current runtime, cache, proxy, and tooling behavior.

## Root Cause
- The repo already completed the large Next 16 migration, but it is still pinned to an earlier `16.0.x` release in `package.json`.
- Next.js 16.2 adds meaningful performance and debugging improvements, and the repo needs dependency alignment plus targeted regression verification instead of another broad framework migration.
- The app depends heavily on Next cache semantics, and prior work already uncovered a stale-manifest edge case, so the upgrade needs a deliberate verification pass.

## Fix / Approach
- Align `next`, `eslint-config-next`, and `@next/eslint-plugin-next` to `16.2.x`.
- Refresh the `pnpm` lockfile.
- Verify Node `20.9+` expectations across local, CI, and deploy configuration.
- Keep `next.config.ts`, `proxy.ts`, and `eslint.config.mjs` on the minimal path: only change them if verification proves a `16.2` delta is actually needed.
- Re-run lint/build and manual smoke checks against document save, manifest refresh, public `/p` route, auth/proxy behavior, PWA asset bypasses, and AI routes.
- Defer optional `16.2` features for now: `transitionTypes`, `unstable_catchError()`, `unstable_retry()`, `experimental.prefetchInlining`, `experimental.cachedNavigations`, and `experimental.appNewScrollHandler`.

## Subtasks
- [x] Align framework and Next ESLint package versions to `16.2.x` and refresh the `pnpm` lockfile.
- [x] Verify Node `20.9+` expectations in CI and any repo documentation or config that controls runtime selection.
- [x] Re-validate `next.config.ts`, `proxy.ts`, and `eslint.config.mjs` under `16.2.x`, applying only minimal required changes.
- [x] Run `pnpm lint` and `pnpm build`.
- [x] Manually verify document saves, manifest refresh/cache invalidation, public `/p` rendering, auth/proxy flows, PWA asset bypasses, and AI routes.
- [x] Record whether optional `16.2` features are deferred or adopted now.

## Files Changed
- `package.json`
- `pnpm-lock.yaml`
- `next.config.ts`
- `proxy.ts`
- `eslint.config.mjs`
- `.github/workflows/workflow-gates.yml`
- `docs/issues/issue-20.md`
- `docs/issues/README.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-26 | refactor | Created isolated `refactor/nextjs-16-2-upgrade` worktree branch, opened Issue 20, and scoped the upgrade as dependency alignment plus targeted verification rather than a fresh Next 16 migration. |
| 2026-03-26 | refactor | Upgraded package ranges to `^16.2.0` and refreshed the lockfile to `next@16.2.1` / Next ESLint `16.2.1`, added `engines.node >=20.9.0`, pinned CI to Node `20.9.0`, documented the Node floor in `README.md`, and added `turbopack.root = process.cwd()` to avoid incorrect workspace-root inference in worktrees. |
| 2026-03-26 | refactor | Final manual verification completed: application behavior is working as expected after the 16.2 upgrade, including the authenticated flows previously left pending in the issue checklist. |

## Test Plan
- `pnpm install`
- `pnpm lint`
- `pnpm build`
- Manual checks:
  - Completed: save a document and confirm no stale content.
  - Completed: refresh the file tree and confirm manifest invalidation still works.
  - Completed: open a real public `/p/...` route and verify rendering and metadata still load.
  - Completed: verify auth sign-in route boots and protected APIs return `401`.
  - Completed: verify PWA/public assets remain reachable without auth via `/manifest.webmanifest`.
  - Completed: verify AI route authorization path still responds from `/api/ai/models`.

## Definition of Done
- Framework and ESLint dependencies are aligned to `16.2.x`.
- Runtime expectations are explicit for Node `20.9+`.
- Lint and build pass.
- Manual smoke checks pass.
- Optional `16.2` features are explicitly categorized as deferred or adopted.
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `docs/plans/2026-03-26-refactor-nextjs-16-2-upgrade-verification-plan.md`
- `docs/stories/story-12.md`
- `docs/decisions/next16-upgrade.md`
- `docs/issues/issue-17.md`
