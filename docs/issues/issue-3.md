# Issue 3 — Insecure Default Authentication Configuration

## Type
- bug

## Status
- resolved

## Related Story
- None

## Description
The `isAllowedUser()` function in `lib/auth/index.ts` returns `true` when `GITHUB_ALLOWED_LOGIN` environment variable is not set. This violates "secure by default" — an admin deploying without configuring the allowlist would unknowingly expose the app to all authenticated GitHub users.

## Root Cause
The code assumes an empty allowlist means "allow everyone" for playground convenience, but this creates a security risk in production deployments where the admin expects the app to be restricted by default.

## Fix / Approach
- Invert the default: deny access when allowlist isn't configured
- Add explicit `AUTH_INSECURE_ALLOW_ALL=true` opt-in for development/playground use
- This makes the secure behavior the default, requiring explicit opt-in for the permissive mode

## Files Changed
- `lib/auth/index.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-17 | fix | Added `AUTH_INSECURE_ALLOW_ALL` env var and inverted default to deny-all when allowlist not configured |

## Test Plan
- Manual: Verify that without `GITHUB_ALLOWED_LOGIN` or `AUTH_INSECURE_ALLOW_ALL`, authenticated users are denied
- Manual: Verify that with `AUTH_INSECURE_ALLOW_ALL=true`, all authenticated users are allowed
- Manual: Verify that with `GITHUB_ALLOWED_LOGIN` set, only that user is allowed
- Run `pnpm lint`

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- Security task: `docs/TASK.md`
