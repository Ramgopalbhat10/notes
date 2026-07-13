# Progress

Current issue: `docs/issues/issue-44.md`

Current section: Issue 44 — @libsql/client hashed Turbopack external still 500s after createRequire fix

Previous tasks (latest completed batch only):
- [x] Switch `lib/platform/db.ts` to `@libsql/client/web` + `drizzle-orm/libsql/web`
- [x] Add `transpilePackages: ["@libsql/client"]`; remove ineffective `serverExternalPackages` entry
- [x] Update Issue 44 / learning / indexes
- [x] `pnpm lint` + `pnpm build` pass; zero hashed `@libsql/client-*` in `.next/server`

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `fix/libsql-web-client-vercel`
- Call sites unchanged: auth + file-versions still share `db` from `lib/platform/db.ts`; capture already runs from API routes and server actions.
- Related: Issue 43 / PR #119 (insufficient), Story 28 / PR #118
