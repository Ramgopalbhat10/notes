# 2026-07-13-turbopack-native-package-bundling

- Area: `build`
- Context: Deployed the file version history feature (Story 28, PR #118), which introduced direct `@libsql/client` imports in server actions and API routes for the first time.
- Symptom: Every save returned a 500 Internal Server Error in production (Vercel). Logs showed `Cannot find package '@libsql/client-bc2a1f2e4d569585'` — a mangled module name that Turbopack produced but could not resolve at runtime.
- Root cause: Turbopack (Next.js 16 default bundler) attempted to bundle `@libsql/client` — which ships native/C++ bindings — into server chunks. Without a `serverExternalPackages` entry, Turbopack mangled the package name and the resulting module was unresolvable in Vercel's serverless runtime. The issue was latent because `@libsql/client` had previously been imported only transitively through better-auth, which handles its own module loading.
- Fix (attempt 1): Added `serverExternalPackages: ["@libsql/client"]` to `next.config.ts`. Intended to tell Turbopack to treat it as an external Node.js module resolved from `node_modules` at runtime. **Insufficient** — a review confirmed Turbopack production builds still emit the hashed module specifier in server chunks because the static ESM `import { createClient } from "@libsql/client"` at the top of `lib/platform/db.ts` forces Turbopack to create a bundled reference regardless of the external-packages config.
- Fix (actual): Replaced the static `import { createClient } from "@libsql/client"` with a runtime `createRequire(import.meta.url)` call inside `lib/platform/db.ts`. The `require("@libsql/client")` is resolved by Node at runtime from `node_modules` — Turbopack never sees it as a static import to bundle. The `type Client` import is type-only (erased at build time). Both `serverExternalPackages` (defense in depth) and `createRequire` (actual fix) are kept.
- Guardrails:
  - Any package that ships native bindings, WASM, or binary assets and is imported directly in server-side code (server actions, API routes, middleware) must be listed in `serverExternalPackages` in `next.config.ts`.
  - **`serverExternalPackages` alone may not be sufficient for Turbopack production builds.** If Turbopack still emits a hashed/mangled module specifier in server chunks, replace the static ESM `import` with a runtime `createRequire(import.meta.url)` call so Node resolves the package at runtime instead of Turbopack bundling it. Keep `serverExternalPackages` as defense in depth.
  - When introducing a new direct server-side import of a package previously used only transitively, check whether it needs `serverExternalPackages` or `createRequire` — the transitive consumer may have handled externalization internally.
  - Production-only bundling issues like this do not surface in local `pnpm dev` or `pnpm build` — always verify server actions end-to-end after deploy, not just at build time.
- References:
  - `next.config.ts` — `serverExternalPackages` entry (defense in depth)
  - `lib/platform/db.ts` — `createRequire` runtime resolution (actual fix)
  - `lib/fs/file-versions.ts` (first direct `@libsql/client` import in app server code)
  - Issue: `docs/issues/issue-43.md`
