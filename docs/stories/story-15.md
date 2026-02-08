# Story 15 — PWA Enablement (Next.js 16, Turbopack-Safe)

Goal: Make the app installable as a Progressive Web App with native Next.js 16 capabilities and minimal risk to existing auth, AI, and file workflows.

## Scope
- In: native `manifest.webmanifest` route, installable icon assets, minimal service worker (`/sw.js`) with no fetch interception, service worker registration, auth proxy bypass for PWA assets, safe SW headers, metadata/viewport updates, and README documentation.
- Out: offline API/data caching, background sync, push notifications, advanced Workbox/Serwist runtime caching, package/plugin migration for PWA build tooling.

## Deliverables
- New `app/manifest.ts` route for `GET /manifest.webmanifest`.
- New icon assets in `public/` for installability (`icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`).
- New minimal service worker at `public/sw.js`.
- New client registration component at `components/pwa/pwa-register.tsx`.
- Metadata + viewport enhancements in `app/layout.tsx`.
- Proxy bypass updates in `proxy.ts` so PWA assets remain reachable without auth.
- Explicit service worker response headers via `next.config.ts`.
- README section documenting PWA support scope and extension points.

## Acceptance Criteria
- App exposes valid `manifest.webmanifest` and installable icon assets.
- `/sw.js` is served with correct content type and no-cache policy.
- Service worker registers cleanly in supported browsers.
- Auth proxy does not block manifest/service worker/icon endpoints.
- Existing protected flows and APIs continue to work unchanged.
- Lint/build pass without regression.

---

## Story 15.1 — Manifest + App Metadata
- Components
  - `app/manifest.ts` (new)
  - `app/layout.tsx`
  - `lib/site-metadata.ts`
- Behavior
  - Add manifest route with product title/description, standalone display, `/files` start URL, and theme/background colors aligned to app styling.
  - Add PWA-friendly metadata fields (`applicationName`, `appleWebApp`, `manifest`) and export `viewport.themeColor`.

Sub-tasks
- [ ] Add `app/manifest.ts` returning `MetadataRoute.Manifest`.
- [ ] Use `siteMetadata` values for name/short name/description.
- [ ] Add `manifest` + `applicationName` + `appleWebApp` in root metadata.
- [ ] Export root `viewport` with matching `themeColor`.

Test Plan
- Load `/manifest.webmanifest` and validate key fields.
- Verify metadata compiles and pages render without hydration/typing errors.

---

## Story 15.2 — Service Worker + Registration
- Components
  - `public/sw.js` (new)
  - `components/pwa/pwa-register.tsx` (new)
  - `app/layout.tsx`
- Behavior
  - Add a minimal service worker lifecycle (`install`/`activate`) only; no runtime caching in v1.
  - Register service worker from root layout once on client.

Sub-tasks
- [ ] Create `public/sw.js` with `skipWaiting` + `clients.claim`.
- [ ] Create client-only registration component using `navigator.serviceWorker.register("/sw.js")`.
- [ ] Mount registration component in root layout.
- [ ] Keep implementation silent-safe (no user-facing errors for unsupported browsers).

Test Plan
- Verify service worker appears as registered/activated in browser devtools.
- Confirm no console errors in supported browsers.

---

## Story 15.3 — Routing/Proxy/Headers Safety
- Components
  - `proxy.ts`
  - `next.config.ts`
- Behavior
  - Ensure auth proxy bypass includes manifest, service worker, and icon assets.
  - Ensure service worker response headers are explicit and cache-safe.

Sub-tasks
- [ ] Add bypass conditions for `/manifest.webmanifest`, `/sw.js`, and icon files.
- [ ] Add `next.config.ts` `headers()` entry for `/sw.js` content type + no-store cache policy.
- [ ] Keep existing auth behavior for protected routes and APIs unchanged.

Test Plan
- Confirm unauthenticated requests to PWA assets return 200.
- Confirm protected routes continue redirecting/guarding as before.

---

## Story 15.4 — Assets + Documentation + Verification
- Components
  - `public/` icon assets
  - `README.md`
- Behavior
  - Add installable icon assets for major platforms.
  - Document included PWA scope and what is intentionally deferred.

Sub-tasks
- [ ] Add `icon-192x192.png`, `icon-512x512.png`, and `apple-touch-icon.png`.
- [ ] Add README section describing installable-first scope (no offline API/data caching yet).
- [ ] Document extension point (`public/sw.js`) for future caching strategy.
- [ ] Run lint/build and smoke test manifest/SW endpoints.

Test Plan
- Validate installability prerequisites (manifest + icons + SW available).
- Run `pnpm -s lint` and `pnpm -s build`.

---

## Definition of Done
- PWA installability is enabled with native Next.js setup.
- Service worker is minimal and non-invasive (no fetch caching).
- Proxy and headers are adjusted so PWA assets are consistently reachable.
- Existing app behavior remains stable across auth/API/chat/file flows.
- Story and docs are updated for maintainability.

## References
- https://nextjs.org/docs/app/guides/progressive-web-apps
- https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://serwist.pages.dev/docs/next/turbo
