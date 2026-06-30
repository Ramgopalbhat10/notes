# Issue 42 — Next.js 16.3 Instant Navigations Adaptation

## Type
- chore

## Status
- resolved — PR [#116](https://github.com/Ramgopalbhat10/notes/pull/116)

## Related Story
- None

## Description
- Adopt the Next.js 16.3 "Instant Navigations" feature set: enable Partial Prefetching, opt redirect-only routes into the Block strategy with `export const instant = false`, and bump the Next.js + ESLint packages to the 16.3 preview release so the new route config and config flag are recognized.

## Root Cause
- Next.js 16.3 introduces Instant Navigations (Stream / Cache / Block), Partial Prefetching, and Instant Insights (slow/blocking navigations become dev errors when `cacheComponents` is enabled). The repo already has `cacheComponents` enabled with `'use cache'` and `<Suspense>` boundaries, so most routes are instant-ready. However, the two redirect-only pages (`app/page.tsx`, `app/auth/sign-in/page.tsx`) await nothing meaningful and have no loading shell — they would trigger Instant Insights dev errors without an explicit Block opt-out. Partial Prefetching is also not yet enabled, leaving the prefetch-request fan-out from 16.2 behavior in place.

## Fix / Approach
1. Bump `next`, `@next/eslint-plugin-next`, and `eslint-config-next` from `^16.2.4` to `16.3.0-preview.5` (exact pin; 16.3 is currently a Preview release).
2. Enable `partialPrefetching: true` in `next.config.ts` (top-level, alongside `cacheComponents`).
3. Add `export const instant = false` to `app/page.tsx` and `app/auth/sign-in/page.tsx` to opt redirect-only routes into the Block strategy and satisfy Instant Insights.
4. Run `pnpm install` to update the lockfile, then verify with `pnpm lint` and `pnpm build`.

## Files Changed
- `package.json`
- `pnpm-lock.yaml`
- `next.config.ts`
- `app/page.tsx`
- `app/auth/sign-in/page.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-06-30 | chore | Bumped Next.js + ESLint packages to 16.3.0-preview.5, enabled partialPrefetching, added instant=false to redirect pages |

## Test Plan
- `pnpm lint` passes.
- `pnpm build` passes with Turbopack.
- Manual: navigate to `/` and `/auth/sign-in` (with auth bypass) — both redirect to `/files` without Instant Insights dev errors.
- Manual: verify prefetch request fan-out is reduced when scrolling the file tree (Partial Prefetching active).

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- [Next.js 16.3 — Instant Navigations](https://nextjs.org/blog/next-16-3-instant-navigations)
- `docs/decisions/next16-upgrade.md`
