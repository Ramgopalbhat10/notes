# Issue 44 — @libsql/client hashed Turbopack external still 500s after createRequire fix

## Type
- bug

## Status
- resolved

## Related Story
- Story 28 (file version history)
- Follow-up to Issue 43 (PR #119)

## Description
- After deploying Issue 43's `createRequire` + `serverExternalPackages` fix (PR #119), Vercel still logs:
  `Cannot find package '@libsql/client-bc2a1f2e4d569585' imported from .next/server/chunks/ssr/[turbopack]_runtime.js`
- Error digest in this report: `821012708` (previous Issue 43 digest was `1009710393`).
- Timestamp `2026-07-13 15:23:21` is after the createRequire commit (`14:54:35 UTC`), so the prior fix did not stop the failure.

## Root Cause
- `@libsql/client` is already on Next.js's default `serverExternalPackages` list.
- Turbopack externalizes it as a hashed alias (`@libsql/client-<hash>` or `@libsql/client-<hash>/web`) under `.next/node_modules` (Next.js #86375). Those aliases often fail to resolve in Vercel serverless artifacts (Next.js #93901).
- `createRequire("@libsql/client")` in `lib/platform/db.ts` was insufficient because `drizzle-orm/libsql` still has a static top-level `import { createClient } from "@libsql/client"`, which keeps the hashed external in production server chunks.
- Switching only to `@libsql/client/web` was also insufficient: Turbopack still emitted `await import("@libsql/client-<hash>/web")` because the package root remains on the default external list.
- Local `pnpm build` after Issue 43 still contained `@libsql/client-bc2a1f2e4d569585` in `.next/server/chunks` — matching the Vercel error exactly.

## Fix / Approach
- Keep the existing shared Drizzle pattern: `file-versions.ts` and auth both use `import { db } from "@/lib/platform/db"`. No change to call sites (API routes + server actions already both capture versions).
- Fix only the client construction in `lib/platform/db.ts` for Vercel:
  1. HTTP web client + drizzle web adapter (`@libsql/client/web`, `drizzle-orm/libsql/web`)
  2. `transpilePackages: ["@libsql/client"]` so Turbopack bundles instead of hashed externals
  3. Drop the ineffective explicit `serverExternalPackages: ["@libsql/client"]` entry
- Note: moving capture exclusively into API routes would not fix this — `PUT /api/fs/file` already calls `captureFileVersion`, and that path still imports the same `db` module.

## Files Changed
- `lib/platform/db.ts`
- `next.config.ts`
- `docs/issues/issue-43.md` (mark follow-up)
- `docs/learnings/2026-07-13-turbopack-native-package-bundling.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-07-13 | docs | Opened Issue 44 after confirming Issue 43's createRequire fix still emits hashed `@libsql/client-*` in production build chunks. |
| 2026-07-13 | fix | Switched shared `db.ts` to `@libsql/client/web` + `drizzle-orm/libsql/web` and `transpilePackages: ["@libsql/client"]`. Kept existing drizzle call sites (auth + file-versions via shared `db`). Lint/build pass; zero hashed `@libsql/client-*` in `.next/server`. |

## Test Plan
- `pnpm lint`
- `pnpm build`
- Grep `.next/server` for `@libsql/client-[a-f0-9]` — expect zero matches
- Confirm `.next/node_modules/@libsql` does not exist after build
- After deploy: save a markdown file and open version history without 500s

## Definition of Done
- Fix verified (lint + build pass; no hashed `@libsql/client-*` in server chunks).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- Learning updated with the failed createRequire path and the web-client + transpilePackages fix.

## References
- Issue 43 / PR #119
- Story 28 / PR #118
- Next.js #86375 (hashed serverExternalPackages aliases)
- Next.js #93901 (hashed aliases unresolved on Vercel)
- Learning: `docs/learnings/2026-07-13-turbopack-native-package-bundling.md`
