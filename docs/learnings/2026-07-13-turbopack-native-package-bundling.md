# 2026-07-13-turbopack-native-package-bundling

- Area: `build`
- Context: Deployed the file version history feature (Story 28, PR #118), which introduced direct `@libsql/client` imports in server actions and API routes for the first time.
- Symptom: Every save returned a 500 Internal Server Error in production (Vercel). Logs showed `Cannot find package '@libsql/client-bc2a1f2e4d569585'` — a mangled module name that Turbopack produced but could not resolve at runtime.
- Root cause: Turbopack (Next.js 16 default bundler) attempted to bundle `@libsql/client` — which ships native/C++ bindings — into server chunks. Without a `serverExternalPackages` entry, Turbopack mangled the package name and the resulting module was unresolvable in Vercel's serverless runtime. The issue was latent because `@libsql/client` had previously been imported only transitively through better-auth, which handles its own module loading.
- Fix: Added `serverExternalPackages: ["@libsql/client"]` to `next.config.ts` so Turbopack treats it as an external Node.js module resolved from `node_modules` at runtime.
- Guardrails:
  - Any package that ships native bindings, WASM, or binary assets and is imported directly in server-side code (server actions, API routes, middleware) must be listed in `serverExternalPackages` in `next.config.ts`.
  - When introducing a new direct server-side import of a package previously used only transitively, check whether it needs `serverExternalPackages` — the transitive consumer may have handled externalization internally.
  - Production-only bundling issues like this do not surface in local `pnpm dev` or `pnpm build` — always verify server actions end-to-end after deploy, not just at build time.
- References:
  - `next.config.ts`
  - `lib/fs/file-versions.ts` (first direct `@libsql/client` import in app server code)
  - Issue: `docs/issues/issue-43.md`
