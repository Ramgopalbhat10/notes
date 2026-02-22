# Issue 11 — Information Leakage in S3 Error Responses

## Type
- bug

## Status
- resolved

## Related Story
- None

## Description
The application leaks raw upstream error messages (specifically from S3) to the client in 400 Bad Request responses.
This occurs in `app/api/fs/file/route.ts:71` where `message` is returned directly to the client.

## Root Cause
The `handleS3Error` function in `app/api/fs/file/route.ts` directly uses the error message from the exception in the JSON response for status 400, potentially exposing internal implementation details or sensitive paths.

## Fix / Approach
Modify `app/api/fs/file/route.ts` to:
1.  Log the full error object to `console.error` for server-side debugging.
2.  Return a generic "Bad Request" message to the client for status 400.

## Files Changed
- `app/api/fs/file/route.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2024-05-24 | fix | Replaced raw error message with generic "Bad Request" and added server-side logging. |

## Test Plan
- Manual verification: Send a request that triggers a 400 error (e.g., with an invalid key or triggering an S3 error) and inspect the response body.
- Verify that the response body contains `{ "error": "Bad Request" }` instead of the sensitive message.
- Verify that the server logs contain the full error details.

## Definition of Done
- [x] Fix verified (lint + build pass).
- [x] Status set to `resolved`.
- [x] Dev Log updated.
- [x] Progress updated in `docs/PROGRESS.md`.
