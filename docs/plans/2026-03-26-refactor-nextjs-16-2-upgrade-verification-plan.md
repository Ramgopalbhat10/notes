---
title: refactor: Upgrade Next.js to 16.2.0 and verify repo deltas
type: refactor
date: 2026-03-26
---

# ♻️ Refactor: Upgrade Next.js to 16.2.0 and verify repo deltas

## Overview

This repo is already on `next@^16.0.7`, `react@^19.2.1`, and the major Next 16 migration work has already been completed. The remaining work is a focused upgrade to `16.2.x`, verification of runtime/tooling alignment, and an explicit decision on which new 16.2 features should be deferred rather than bundled into the baseline upgrade.

## Problem Statement / Motivation

The project is close enough to current Next 16 that a `16.2.x` upgrade should be low risk, but the repo still needs a deliberate pass for:

- dependency alignment in [package.json](/home/jarvis/projects/mrgb/notes/package.json#L5)
- runtime verification in CI/deploy around Node `20.9+`, with current CI only pinning major `20` in [.github/workflows/workflow-gates.yml](/home/jarvis/projects/mrgb/notes/.github/workflows/workflow-gates.yml#L28)
- cache-sensitive regressions in the manifest/document flows already implemented on top of Next 16 caching APIs in [lib/cache/manifest-store.ts](/home/jarvis/projects/mrgb/notes/lib/cache/manifest-store.ts#L126), [lib/fs/file-cache.ts](/home/jarvis/projects/mrgb/notes/lib/fs/file-cache.ts#L120), and [app/actions/documents.ts](/home/jarvis/projects/mrgb/notes/app/actions/documents.ts#L47)
- avoiding unnecessary config churn when the repo already has `proxy.ts`, `turbopack`, `cacheComponents`, and image settings wired up in [next.config.ts](/home/jarvis/projects/mrgb/notes/next.config.ts#L3) and [proxy.ts](/home/jarvis/projects/mrgb/notes/proxy.ts#L4)

The official Next.js 16.2 release on March 18, 2026 adds meaningful developer-experience improvements, especially faster `next dev`, faster server rendering, and better debugging, but it does not appear to impose new mandatory config migrations for a repo that already completed the broader Next 16 upgrade.

## Proposed Solution

Ship the upgrade in two clearly separated scopes.

### Scope A: Required upgrade work

- Upgrade `next` from `^16.0.7` to `16.2.x` in [package.json](/home/jarvis/projects/mrgb/notes/package.json#L61).
- Align `eslint-config-next` and `@next/eslint-plugin-next` with the same `16.2.x` line in [package.json](/home/jarvis/projects/mrgb/notes/package.json#L76).
- Refresh the `pnpm` lockfile and keep `pnpm` as the only package manager for this repo.
- Re-verify that [next.config.ts](/home/jarvis/projects/mrgb/notes/next.config.ts#L3) remains valid without new migration work.
- Re-verify that [proxy.ts](/home/jarvis/projects/mrgb/notes/proxy.ts#L4) remains valid without new migration work.
- Re-verify that [eslint.config.mjs](/home/jarvis/projects/mrgb/notes/eslint.config.mjs) remains valid without new migration work.
- Run the existing smoke path for the cache-heavy surfaces and auth-gated routing.

### Scope B: Explicitly optional 16.2 adoption

Do not treat these as upgrade blockers. Triage them after the baseline upgrade is stable:

- `transitionTypes` on `next/link`
- `unstable_catchError()` and `unstable_retry()` for error recovery UX
- `experimental.prefetchInlining`
- `experimental.cachedNavigations`
- `experimental.appNewScrollHandler`
- extra debugging workflows such as `next start --inspect`

## Technical Considerations

- Existing Next 16 migration work already covered the major breaking changes in [docs/stories/story-12.md](/home/jarvis/projects/mrgb/notes/docs/stories/story-12.md#L1) and [docs/decisions/next16-upgrade.md](/home/jarvis/projects/mrgb/notes/docs/decisions/next16-upgrade.md#L1).
- The repo already uses the current `proxy.ts` convention in [proxy.ts](/home/jarvis/projects/mrgb/notes/proxy.ts#L4), so there is no remaining middleware-to-proxy migration work.
- The repo already uses top-level `turbopack`, `cacheComponents`, `images.remotePatterns`, and explicit `minimumCacheTTL` in [next.config.ts](/home/jarvis/projects/mrgb/notes/next.config.ts#L3), so no new `16.2`-specific config change is expected unless verification surfaces a bug.
- Cache invalidation behavior is the highest-risk area because the app relies on `"use cache"`, `cacheTag`, `cacheLife`, `updateTag`, and `revalidateTag` across manifest and file reads in [lib/cache/manifest-store.ts](/home/jarvis/projects/mrgb/notes/lib/cache/manifest-store.ts#L126), [lib/fs/file-cache.ts](/home/jarvis/projects/mrgb/notes/lib/fs/file-cache.ts#L120), and [app/actions/documents.ts](/home/jarvis/projects/mrgb/notes/app/actions/documents.ts#L63).
- Prior repo history already captured a stale-manifest gotcha for `revalidateTag(tag, "max")` in [docs/issues/issue-17.md](/home/jarvis/projects/mrgb/notes/docs/issues/issue-17.md#L60). That behavior must be rechecked after the dependency bump.
- CI currently sets Node `20` rather than an explicit `20.9+` floor in [.github/workflows/workflow-gates.yml](/home/jarvis/projects/mrgb/notes/.github/workflows/workflow-gates.yml#L28). The plan should verify whether that is sufficiently deterministic across local, CI, and deploy environments.

## Execution Plan

### Phase 1: Dependency and runtime alignment

- Update [package.json](/home/jarvis/projects/mrgb/notes/package.json#L20) to `next@16.2.x`.
- Update [package.json](/home/jarvis/projects/mrgb/notes/package.json#L73) so `eslint-config-next` and `@next/eslint-plugin-next` are on the same `16.2.x` version.
- Regenerate the `pnpm` lockfile.
- Verify Node `20.9+` locally, in CI, and in deploy documentation/config.

### Phase 2: Config and behavior verification

- Confirm no required changes are needed in [next.config.ts](/home/jarvis/projects/mrgb/notes/next.config.ts#L3).
- Confirm [proxy.ts](/home/jarvis/projects/mrgb/notes/proxy.ts#L4) still behaves correctly for auth bypasses, PWA assets, and public file rewrites.
- Recheck lint/build/start commands in [package.json](/home/jarvis/projects/mrgb/notes/package.json#L5).

### Phase 3: Regression-focused smoke testing

- Verify document save path through [app/actions/documents.ts](/home/jarvis/projects/mrgb/notes/app/actions/documents.ts#L47).
- Verify manifest refresh and cache invalidation through [lib/cache/manifest-store.ts](/home/jarvis/projects/mrgb/notes/lib/cache/manifest-store.ts#L126) and [lib/fs/file-cache.ts](/home/jarvis/projects/mrgb/notes/lib/fs/file-cache.ts#L144).
- Verify public file rendering path in [app/p/[[...path]]/page.tsx](/home/jarvis/projects/mrgb/notes/app/p/[[...path]]/page.tsx#L36).
- Verify auth-gated routes, AI routes, and PWA/public asset bypass behavior.

### Phase 4: Optional 16.2 feature triage

- Defer `transitionTypes`, `unstable_catchError()`, `unstable_retry()`, `experimental.prefetchInlining`, `experimental.cachedNavigations`, and `experimental.appNewScrollHandler`.
- Record the deferral explicitly in the issue/PR so the baseline upgrade remains small and reviewable.

## Acceptance Criteria

- [x] `next`, `eslint-config-next`, and `@next/eslint-plugin-next` are aligned to `16.2.x` in [package.json](/home/jarvis/projects/mrgb/notes/package.json#L61).
- [x] `pnpm` lockfile is refreshed with no `npm`-only workflow introduced.
- [x] No required `16.2` config migration is left undone in [next.config.ts](/home/jarvis/projects/mrgb/notes/next.config.ts#L3), [proxy.ts](/home/jarvis/projects/mrgb/notes/proxy.ts#L4), or [eslint.config.mjs](/home/jarvis/projects/mrgb/notes/eslint.config.mjs).
- [x] The app passes `pnpm lint`, `pnpm build`, and `pnpm start` on Node `20.9+`.
- [x] Manual smoke checks pass for `app/actions/documents.ts` document saves.
- [x] Manual smoke checks pass for manifest refresh and cache invalidation.
- [x] Manual smoke checks pass for `/p/...` public file rendering.
- [x] Manual smoke checks pass for auth redirects and API authorization.
- [x] Manual smoke checks pass for PWA/public asset bypasses in `proxy.ts`.
- [x] Manual smoke checks pass for AI routes under `app/api/ai/*`.
- [x] Optional 16.2 features are explicitly categorized as `adopt now` or `defer`.

## Success Metrics

- The upgrade lands as a single focused refactor without reopening the broader Next 16 migration scope.
- No regression is found in the editor save flow, manifest refresh flow, public note rendering, or auth proxy behavior.
- The team can use the 16.2 debugging improvements and faster dev server behavior without additional config churn.

## Dependencies & Risks

- Dependency on official Next.js guidance for projects upgrading from `16.0.x`; versions before `16.1.0` should prefer the codemod-based upgrader.
- Risk of cache regressions because this repo depends heavily on Next cache semantics and already hit a stale-manifest bug in [docs/issues/issue-17.md](/home/jarvis/projects/mrgb/notes/docs/issues/issue-17.md#L60).
- Risk of runtime mismatch if deployment infrastructure resolves Node `20` below `20.9`.
- Risk of unnecessary scope growth if optional 16.2 APIs are mixed into the baseline package bump.
- Build verification depends on the secret-backed environment already required by [.github/workflows/workflow-gates.yml](/home/jarvis/projects/mrgb/notes/.github/workflows/workflow-gates.yml#L43).

## References & Research

### Internal References

- Prior migration story: [docs/stories/story-12.md](/home/jarvis/projects/mrgb/notes/docs/stories/story-12.md#L1)
- Prior upgrade decision doc: [docs/decisions/next16-upgrade.md](/home/jarvis/projects/mrgb/notes/docs/decisions/next16-upgrade.md#L1)
- Current Next version and scripts: [package.json](/home/jarvis/projects/mrgb/notes/package.json#L5)
- Current Next config: [next.config.ts](/home/jarvis/projects/mrgb/notes/next.config.ts#L3)
- Current proxy implementation: [proxy.ts](/home/jarvis/projects/mrgb/notes/proxy.ts#L4)
- Cache manifest loader: [lib/cache/manifest-store.ts](/home/jarvis/projects/mrgb/notes/lib/cache/manifest-store.ts#L126)
- Cache file loader: [lib/fs/file-cache.ts](/home/jarvis/projects/mrgb/notes/lib/fs/file-cache.ts#L120)
- Save action cache invalidation: [app/actions/documents.ts](/home/jarvis/projects/mrgb/notes/app/actions/documents.ts#L63)
- Public file route cache tags: [app/p/[[...path]]/page.tsx](/home/jarvis/projects/mrgb/notes/app/p/[[...path]]/page.tsx#L36)
- Prior stale-cache issue: [docs/issues/issue-17.md](/home/jarvis/projects/mrgb/notes/docs/issues/issue-17.md#L60)
- CI Node setup: [.github/workflows/workflow-gates.yml](/home/jarvis/projects/mrgb/notes/.github/workflows/workflow-gates.yml#L28)

### External References

- Next.js 16.2 release blog: https://nextjs.org/blog/next-16-2
- Next.js upgrade guide: https://nextjs.org/docs/app/getting-started/upgrading
- Next.js version 16 migration guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js proxy docs: https://nextjs.org/docs/app/getting-started/proxy
- Next.js ESLint config docs: https://nextjs.org/docs/app/api-reference/config/eslint
- Next.js installation docs for Node requirement: https://nextjs.org/docs/app/getting-started/installation
- Next.js error handling docs: https://nextjs.org/docs/app/getting-started/error-handling
- Next.js error file convention docs: https://nextjs.org/docs/app/api-reference/file-conventions/error
- Next.js CLI docs: https://nextjs.org/docs/app/api-reference/cli/next

## Notes

- No relevant brainstorm document was found in `docs/brainstorms/`.
- No relevant institutional learning file exists in `docs/learnings/`; the useful local context is in the prior story, decision document, and cache regression issue listed above.
- External research was required because the request is tied to a current framework release dated March 18, 2026.
- The package ranges were updated to `^16.2.0`; the refreshed lockfile currently resolves Next and the Next ESLint packages to `16.2.1`.
- `next.config.ts` now sets `turbopack.root = process.cwd()` to prevent incorrect workspace-root inference when multiple lockfiles are present.
