# Story 12 — Next.js 16 Upgrade

Goal: Upgrade Markdown Vault to Next.js 16 with new caching APIs, config changes, and Server Actions while preserving existing UX.

## Scope
-- In: package/runtime bumps, `next.config.ts` updates (Turbopack, cacheComponents, proxy rename), async API fixes, caching/tagging, server action adoption, image & lint adjustments.
-- Out: Design refresh, new AI features, editor UX changes beyond what upgrade requires.

## Deliverables
- `package.json`/`pnpm-lock.yaml` reflect Next 16 + React 19.2 + TS 5.1.
- `next.config.ts` updated (top-level `turbopack`, `cacheComponents` flag once ready, image settings, proxy config rename).
- All `params`/`searchParams`/metadata APIs use async accessors.
- Caching hooks (`cacheTag`, `cacheLife`, `revalidateTag`, `updateTag`, `refresh`) applied to manifest + document flows.
- Middleware migrated to `proxy.ts` without edge runtime usage.
- Image + ESLint + script changes handled per guide.

## Acceptance Criteria
- `pnpm build` + `pnpm start` succeed under Node 20.9.
- Turbopack dev server runs by default without `--turbopack` flags.
- File tree refresh + document saves trigger correct cache invalidation via new APIs.
- Server Actions replace at least one write endpoint (document save or tree mutation) using `updateTag` + `refresh`.
- No lingering `unstable_` cache API imports or deprecated config flags.

---

## Story 12.1 — Dependencies & Config
- Components
  - `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `proxy.ts`.
- Behavior
  - Bump core packages, ensure Node 20.9; add `turbopack` top-level config, `cacheComponents` flag (gated rollout), rename middleware file/exports, update scripts (`next dev`, `next build`, `eslint`).

Sub‑tasks
- [x] Run Next codemod or manual bump to `next@16`, `react@19.2`, `react-dom@19.2`, `typescript@>=5.1`.
- [x] Update scripts (`dev`, `build`, `start`, `lint`) to remove `--turbopack` / `next lint`.
- [x] Rename `middleware.ts`→`proxy.ts`, adjust exported function + config flags.
- [x] Review `images` config (remote patterns, TTL, sizes) and add `cacheComponents` toggle placeholder.

Test Plan
- `pnpm install`
- `pnpm lint`
- `pnpm build`

---

## Story 12.2 — Async APIs & Routing
- Components
  - All pages/layouts/routes using `params`, metadata generators, `app/@*` defaults.
- Behavior
  - Ensure every consumer awaits `params`/`searchParams`, add missing `default.tsx` for parallel routes, update metadata/image/sitemap handlers to async id patterns.

Sub‑tasks
- [x] Run `npx next typegen` (optional) and update types.
- [x] Fix `generateMetadata`, `generateImageMetadata`, `sitemap`, etc., to await promises.
- [x] Audit `app/@*` slots for required `default.tsx` files (none needed; no `@` directories in current tree).

Notes
- `app/files/[[...path]]/layout.tsx` and `app/p/[[...path]]/page.tsx` are the only App Router entries consuming `params`; both now await `params: Promise<{ path?: string[] }>` for their page + metadata exports.
- No icon/sitemap routes exist yet, so no further async adjustments were required.

Test Plan
- `pnpm build` (should fail if any synchronous access remains).

---

## Story 12.3 — Caching & Server Actions
- Components
  - `lib/file-tree-builder.ts`, `lib/manifest-store.ts`, `lib/persistent-document-cache.ts`, relevant route handlers/actions (tree refresh, document save), `VaultWorkspace` integration.
- Behavior
  - Adopt `cacheTag`/`cacheLife` for manifest + document fetchers; on writes call `updateTag` (immediate) and `revalidateTag(profile)` (background). Add `refresh()` to Server Actions as needed. Convert at least document save flow to Server Action.

Sub‑tasks
- [x] Apply `cacheTag` to manifest + doc fetch utilities.
- [x] Call `updateTag` + `revalidateTag` in tree refresh + doc save flows (tree refresh remains a route handler, so we continue to `revalidateTag(MANIFEST_CACHE_TAG, "max")` there while document saves now call `updateTag` via a Server Action).
- [x] Introduce Server Action for document save (ETag aware) replacing API call, update client to call action.
- [x] Use `refresh()` or optimistic store updates post action.

Notes
- `lib/manifest-store.ts` and `lib/file-cache.ts` now wrap their loaders in `"use cache"` blocks, register cache tags, and set cache-lifetime profiles (`minutes` for manifests, `max` for document content).
- A new `app/actions/documents.ts` Server Action writes files to S3, calls `updateTag(getFileCacheTag(key))`, revalidates the manifest tag, and updates Redis to keep `getCachedFile` hot.
- `stores/editor.ts` imports the Server Action directly, so the editor no longer calls `/api/fs/file` for saves; Zustand + IndexedDB updates remain the optimistic layer we rely on instead of forcing a router `refresh()`.

Test Plan
- Save document via editor -> immediate status update + no stale content.
- Trigger tree refresh -> manifest re-fetches without manual reload.

---

## Story 12.4 — Images, ESLint, Tooling
- Components
  - `next.config.ts` (`images`, `eslint` removal), lint config/scripts, docs updates.
- Behavior
  - Migrate `images.domains`→`remotePatterns`, adjust TTL/quality defaults, ensure `eslint.config.mjs` invoked directly.

Sub‑tasks
- [x] Configure `images.remotePatterns`, `minimumCacheTTL`, `imageSizes`, `qualities` as needed.
- [x] Remove deprecated config fields (`images.domains`, `experimental.dynamicIO`, `eslint`).
- [x] Update README/docs to explain new scripts + Node requirement.

Test Plan
- `pnpm lint`
- `pnpm build` (validates image config).

---

## Definition of Done
- All checklist items marked.
- `docs/next16-upgrade.md` kept current with implementation status.
- Staging deploy on Node 20.9 passes smoke tests (auth, file tree, editor, AI sidebar).
