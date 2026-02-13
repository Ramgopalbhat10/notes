# Next.js 16 Upgrade Plan

This document translates the official [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) to the current **Markdown Vault** architecture. It highlights every required change beyond enabling Cache Components so we can upgrade predictably.

---

## 1. Current Architecture Snapshot

| Area | Notes |
| --- | --- |
| Routing | App Router only (`app/`), multiple API route handlers under `app/api/…`, file system navigation via `app/files/[[...path]]`. |
| Rendering | Server Components drive shell + markdown preview; key client components (`markdown-editor`, `vault-workspace`) hydrate per selection. |
| Data & Caching | File tree manifest + markdown content fetched from S3 (Tigris) with Upstash/Redis mirrors. Local stores (`lib/manifest-store.ts`, `lib/persistent-document-cache.ts`) plus ETag-aware autosave flows. |
| Middleware | Single `middleware.ts` handles auth redirect rules (requires rename per Next 16). |
| Tooling | `pnpm` workspace, lint via `eslint.config.mjs`, TypeScript strict config, DM Sans font in layout (just switched to Inter/Grotesk/Mono). |

---

## 2. Dependency Upgrades & Runtime Requirements

1. **Node.js 20.9+** – ensure deployment/runtime environment meets the new minimum.
2. **Packages** – bump in `package.json`:
   - `next@^16.0.3`
   - `react@^19.2.0`, `react-dom@^19.2.0`
   - `eslint-config-next` → latest 16-compatible release (if used) or migrate to `@next/eslint-plugin-next` flat config
   - `typescript@>=5.1.0`, `@types/react`, `@types/react-dom`
3. **Codemod (optional but recommended)** – `npx @next/codemod@canary upgrade latest` to auto-handle config moves (`turbopack`, `proxy`, ESLint CLI migration, `unstable_` removals).

---

## 3. Configuration Changes (`next.config.ts`)

| Task | Details |
| --- | --- |
| **Turbopack default** | Remove `--turbopack` flags from scripts; optionally configure `turbopack` top-level options (e.g., `resolveAlias`, `fileSystemCache`). |
| **Cache Components flag** | Add `cacheComponents: true` after verifying UX implications (successor to `experimental.dynamicIO`). |
| **Proxy rename** | If we still rely on middleware, rename `middleware.ts` → `proxy.ts`, update exports to `export function proxy(request)`; update config fields (e.g., `skipProxyUrlNormalize`). |
| **Images** | Replace deprecated `images.domains` with `remotePatterns`, review `imageSizes`, `qualities`, `minimumCacheTTL` defaults if we depend on old behavior. |
| **Linting config removal** | Remove `eslint` option from Next config (Now we invoke ESLint directly). |
| **Experimental flags cleanup** | Drop `experimental.dynamicIO`, `experimental.ppr`, etc., per removal list. |

---

## 4. Async Request APIs & Type Safety

Next 16 removes synchronous access to `params`, `searchParams`, `cookies`, `headers`, and metadata props.

1. **Layouts/Pages** – audit complete. Only two App Router entries consume `params` today and both now await the `Promise` shape from Next 16:
   - `app/files/[[...path]]/layout.tsx` (`generateMetadata`)
   - `app/p/[[...path]]/page.tsx` (`generateMetadata` + default export)
   - No icon/opengraph/sitemap routes exist yet; nothing else requires async adjustments.
2. **Helpers** – run `npx next typegen` to generate `PageProps`/`LayoutProps` helpers for stronger typing.

---

## 5. Caching APIs Beyond Cache Components

| API | How it fits our stack |
| --- | --- |
| `cacheLife` / `cacheTag` (stable names) | Tag manifest + per-document fetches so RSC caches align with our Upstash/S3 storage (implemented via `lib/manifest-store.ts` + `lib/file-cache.ts`). |
| `revalidateTag(tag, profile)` | Use after manifest rebuild or remote doc updates (`profile = "max"` for hard invalidation, `"stale-while-revalidate"` for background refresh). |
| `updateTag(tag)` | Use inside Server Actions (or route handlers migrating to Actions) for read-your-writes semantics on doc saves, tree mutations, AI session updates. Document saves now invoke `updateTag(getFileCacheTag(key))`. |
| `refresh()` | Trigger client router refresh from Server Actions after updates that impact client-only stores (e.g., toast counts). |
| Directives `use cache`, `use cache:private` | Optionally wrap expensive server utilities (manifest loader, AI prompts) to define caching scope without manual fetch options.

Implementation targets:
- `lib/file-tree-builder.ts` / `lib/manifest-store.ts`: add `cacheTag("manifest-tree")` when reading, `updateTag` & `revalidateTag` when refresh finishes.
- `lib/persistent-document-cache.ts`: tag each doc fetch, call `updateTag` after successful PUT.
- server actions to replace selected API endpoints for saves/mkdir/move.

Implementation status:
- ✅ `lib/manifest-store.ts` and `lib/file-cache.ts` now call `cacheTag`/`cacheLife` within `"use cache"`-scoped loaders, so manifest + document reads participate in Cache Components invalidation.
- ✅ Document saves run through `app/actions/documents.ts` (Server Action). Successful saves call `updateTag(getFileCacheTag(key))`, `revalidateFileTags`, and `revalidateTag(MANIFEST_CACHE_TAG, "max")`, ensuring read-your-writes and background invalidation.
- ⏳ Tree refresh still runs through `/api/tree/refresh` (needs shared secret), so only `revalidateTag` runs there until we expose a Server Action for privileged refresh jobs.

---

## 6. Server Actions Rollout

Although we currently rely on API routes, Next 16’s stable Server Actions provide tighter integration:

1. **Document Save Action** – co-locate in a server component used by `VaultWorkspace` to reduce client↔server hops and leverage `updateTag`.
2. **File Tree Mutations** – convert `/api/fs/move`, `/api/fs/mkdir`, etc., to actions invoked from client components with `useTransition`.
3. **AI Interactions** – optionally convert `/api/ai/chat` to Server Actions so results stream directly into React. Use `refresh()` or client state to reflect updates.
4. **Security note** – actions run server-side only; any environment secret remains safe.

---

## 7. Middleware → Proxy Migration

1. Rename `middleware.ts` → `proxy.ts`.
2. Update exported function to `export function proxy(request: Request)`.
3. Edge runtime is unsupported here; ensure logic doesn’t require `next/edge`. If we must stay on edge for now, keep middleware and plan follow-up once Next releases updated guidance.

---

## 8. Image Handling Updates

- Replace `images.domains` with `remotePatterns` (define hostnames for S3/Tigris or other CDNs).
- If we rely on 16px responsive images, reintroduce `imageSizes` entry.
- Review `minimumCacheTTL`, `qualities`, and `maximumRedirects` if existing infra depends on previous values.
- Avoid query strings in local image imports or define `images.localPatterns`.

---

## 9. Parallel Routes & Defaults

- Audit `app/@*` directories: add `default.tsx` files returning `null` or `notFound()` where missing.
- Ensure new default files follow async `params` rules.
- Current tree has no `app/@*` directories, so no defaults are required yet; re-audit if/when parallel routes are introduced.

---

## 10. ESLint + Tooling

- Switch to ESLint CLI directly: `"lint": "eslint ."` with flat-config `eslint.config.mjs` already present.
- Remove `next lint` references from scripts/docs.
- Consider enabling React Compiler (`reactCompiler: true`) once baseline upgrade stabilizes.

---

## 11. Testing & Verification Checklist

1. `pnpm lint`
2. `pnpm typecheck` (if script exists)
3. `pnpm build` (Turbopack)
4. `pnpm start`
5. Run storybook/manual QA for markdown editor: ensure autosave, conflict handling, preview operate normally.
6. Validate MCP integration (new `next-devtools` MCP server) by hitting `Next Devtools, run diagnostics` prompt.
7. Smoke-test AI routes, file tree refresh, and auth flows under Node 20.9.

---

## 12. Rollout Strategy

1. Create feature branch `feature/next16-upgrade` (already checked out).
2. Apply codemod + manual fixes incrementally, committing per subsystem (deps/config, caching, proxy rename, Server Actions pilot).
3. Deploy to staging environment running Node 20.9, monitor for caching anomalies.
4. Once stable, enable `cacheComponents` and gradually convert APIs to Actions.
5. Document new workflows in README (fonts done separately, add caching/Server Action sections once implemented).
