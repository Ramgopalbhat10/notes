# Issue 43 — @libsql/client fails to load in Turbopack serverless bundles (500 on save)

## Type
- bug

## Status
- resolved

## Related Story
- Story 28 (file version history — introduced direct `@libsql/client` imports in server actions)

## Description
- After deploying PR #118 (file version history), every save attempt returns a 500 Internal Server Error in production (Vercel).
- Vercel logs show: `Cannot find package '@libsql/client-bc2a1f2e4d569585' imported from .next/server/chunks/ssr/[turbopack]_runtime.js`
- The error digest `1009710393` matches the browser console response, confirming this is the single root cause of the save failure.
- The fix commit (`d850fc5`) was pushed to the feature branch after PR #118 was already merged, so it never reached `main`.

## Root Cause
- `next.config.ts` had no `serverExternalPackages` configuration.
- Turbopack (default bundler in Next.js 16) attempted to bundle `@libsql/client` — which ships native/C++ bindings — into server chunks.
- Turbopack produced a mangled module name (`@libsql/client-bc2a1f2e4d569585`) that could not be resolved at runtime on Vercel's serverless environment.
- Before the version-history feature, `@libsql/client` was only imported transitively through better-auth (which handles its own module loading). The new `file-versions.ts` imports the Turso `db` client directly in server actions and API routes, exposing the Turbopack bundling issue.

## Fix / Approach
- Added `serverExternalPackages: ["@libsql/client"]` to `next.config.ts`.
- This tells Turbopack to treat `@libsql/client` as an external Node.js module — Node resolves it from `node_modules` at runtime instead of Turbopack attempting to bundle it.
- Cherry-picked the fix onto a new `fix/libsql-server-external-package` branch from `main` since the original feature branch was already merged.

## Files Changed
- `next.config.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-07-13 | fix | Cherry-picked `serverExternalPackages` fix onto `fix/libsql-server-external-package` branch from latest `main`, verified lint + build, pushed, and opened PR for direct merge to `main`. |

## Test Plan
- `pnpm lint` — passes
- `npx tsc --noEmit` — passes
- `pnpm build` — passes
- After deploy: verify save no longer returns 500 on production

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- Learning added to `docs/learnings/`.

## References
- PR #118 (merged — file version history feature)
- Story: `docs/stories/story-28.md`
- Learning: `docs/learnings/2026-07-13-turbopack-native-package-bundling.md`
