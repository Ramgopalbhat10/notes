# Issue 33 — Add single-flag auth bypass for local testing

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- Local development currently requires the full GitHub OAuth flow and allowed-user checks even when the goal is only to exercise the app locally. There is no single config switch that disables authn/authz across middleware, API routes, server actions, and the client shell.

## Root Cause
- Authentication is enforced in multiple layers: `proxy.ts` blocks page and API access, `lib/auth/index.ts` requires OAuth env vars and performs session/allowed-user checks, and client UI state depends on Better Auth session endpoints. Without a shared bypass path, local testing still requires a real auth setup.

## Fix / Approach
- Add one `AUTH_BYPASS=true` switch in the shared auth layer.
- When enabled, skip OAuth env validation, return a synthetic local session from server auth helpers, bypass middleware checks, and serve a synthetic session from the Better Auth catch-all route so the client shell can load without sign-in.
- Keep the bypass centralized so routes and actions that already use the auth helpers inherit the behavior automatically.
- Surface bypass state in the UI as a warning icon next to the profile avatar with a hover card, instead of a top banner that can cover header controls.

## Files Changed
- `components/ui/hover-card.tsx`
- `components/app-shell/sections/left-sidebar-footer.tsx`
- `lib/auth/config.ts`
- `lib/auth/index.ts`
- `app/api/auth/[...betterauth]/route.ts`
- `proxy.ts`
- `app/auth/sign-in/sign-in-page-client.tsx`
- `app/auth/sign-in/page.tsx`
- `app/layout.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-18 | chore | Added a centralized `AUTH_BYPASS` mode that skips middleware/server auth checks, serves a synthetic Better Auth session to the client, redirects `/auth/sign-in` back to `/files`, and shows an in-app warning banner while bypass mode is active. |
| 2026-04-18 | chore | Replaced the top auth-bypass banner with a warning icon beside the profile avatar and a hover card so the notice remains visible without blocking header controls. |

## Test Plan
- Verified: `pnpm lint` passes.
- Verified: `pnpm build` passes.
- Verified manually with a local `next dev` run under `AUTH_BYPASS=true`: `GET /api/auth/get-session` returns the synthetic session, `GET /auth/sign-in` redirects, and `GET /api/tree/status` no longer returns `401`.
- Verified visually in code: the bypass notice no longer renders as a fixed header banner; it is attached to the sidebar footer profile area instead.
- Manual: set `AUTH_BYPASS=false` and confirm normal auth behavior still applies.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- User request: add a single env flag to disable auth locally without changing preview/prod behavior.
