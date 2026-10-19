# ADR — Single API Key for Existing Vault CRUD

## Context

This is a single-owner notes application protected by GitHub login and a configured email/login allowlist. The owner needs their other backend applications to create/edit notes without a browser session. Content, metadata, and history already belong to one shared vault.

## Decision

Use one optional server-side `NOTES_API_KEY` as an alternative credential on the existing filesystem APIs. Clients send `Authorization: Bearer <key>` over HTTPS. The shared `hasValidFsApiKey` helper validates both the exact pathname/method allowlist and the credential, using fixed-length SHA-256 digests with `timingSafeEqual`. Unset/blank configuration disables key access.

Both the Next.js proxy and `requireApiUser` use the same helper. Accepted routes/methods are file GET/PUT/DELETE, list GET, mkdir POST, folder DELETE, move POST, and metadata GET/PUT. All other routes retain their existing auth. Invalid keys grant nothing but do not prevent ordinary authorized cookie-session authentication.

A valid key returns a nullable session from the API guard, not a fabricated browser identity. Existing save/history logic already supports a null author. Personal settings also explicitly reject a null session before reading the user ID. Browser session resolution, GitHub configuration, user allowlisting, and server-action authentication are unchanged. The key does not create a session or gain access to AI, settings, tree/refresh, or browser pages.

## Alternatives Considered

- Managed keys with a plugin, schema changes, permissions, folder restrictions, and UI: unnecessary for the owner's requested scope.
- A separate versioned API: duplicates the existing CRUD contract without a current need.
- Global session impersonation or a proxy-wide key bypass: would expose unrelated functionality and is not acceptable.

## Consequences

- One key grants full access to the existing shared-vault CRUD operations, including deletes and publication; there are no per-app permissions, folder restrictions, or key-specific attribution.
- Key rotation/revocation requires changing/removing the environment value on every instance and restarting/redeploying. No database migration or new dependency is required.
- Existing storage consistency, cache handling, ETag semantics, history retention, and response formats remain unchanged.
- Keep the key server-side and out of URLs/logs/client bundles; use a strong random value. The existing `AUTH_BYPASS` and `AUTH_INSECURE_ALLOW_ALL` development switches must remain disabled in production.

## References

- `docs/stories/story-31.md`
- `README.md` — API Access From Other Applications
