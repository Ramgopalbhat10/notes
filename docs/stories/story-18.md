# Story 18 — Secure AI Action Endpoint

Goal: Ensure the AI action endpoint (`/api/ai/action`) requires authentication to prevent abuse of paid AI resources by anonymous users.

## Scope
- In: `app/api/ai/action/route.ts` authentication check using `requireApiUser`.
- Out: Rate limiting changes (existing implementation is kept), other AI endpoints.

## Deliverables
- `app/api/ai/action/route.ts` updated with `requireApiUser` check.

## Acceptance Criteria
- POST requests to `/api/ai/action` without valid session return 401 Unauthorized.
- POST requests with valid session but restricted user (if configured) return 403 Forbidden.
- POST requests with valid session proceed as normal.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-14 | fix | Added `requireApiUser` check to `/api/ai/action/route.ts` to block anonymous access. |
