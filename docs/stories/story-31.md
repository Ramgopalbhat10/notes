# Story 31 — Single API Key for Vault CRUD

Goal: Let the owner's other server-side applications use the existing filesystem CRUD APIs with one configured API key, without changing GitHub/email login.

## Scope
- In: Optional server-side `NOTES_API_KEY`, bearer authentication on the six existing filesystem routes, shared proxy/handler validation, and usage documentation.
- Out: New routes, API-key plugins, dependencies, database changes, key-management UI, per-app keys, scopes, folder restrictions, and storage redesign.

## Deliverables
- `lib/auth/api-key.ts` — exact route/method allowlist and timing-safe key validation.
- `proxy.ts` and `lib/auth/index.ts` — accept a valid key without creating a browser session.
- `app/api/settings/route.ts` — explicitly require a non-null session for per-user settings.
- `README.md` — setup, security boundaries, rotation, and curl CRUD examples.
- `docs/decisions/ADR-vault-api-key.md` — authentication decision and limitations.

## Acceptance Criteria
- A configured key authenticates cookie-free requests only to the existing filesystem route/method combinations.
- Missing, malformed, or incorrect keys do not authorize a request; unset/blank configuration disables key authentication.
- Existing GitHub/email session authentication and CRUD contracts remain unchanged.
- The key cannot unlock browser pages, settings, AI APIs, tree refresh, or server actions.
- API-key saves use a nullable history author rather than a fabricated session.
- No secrets appear in committed files; lint, build, and documented manual checks pass.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-10-19 | verify | Lint/build passed with fixture env; all nine key route/method pairs, session fallback, mocked note CRUD/settings, 13 real HTTP auth checks, and desktop/mobile sign-in smoke checks passed. Added explicit session guards for personal settings. Live OAuth/Tigris/Turso checks require owner credentials and were not performed. |
| 2026-10-19 | feat | Added exact filesystem route/method key validation to both auth gates, retained session fallback and nullable author attribution, and documented setup/rotation/CRUD examples. |
| 2026-10-19 | plan | Reduced the feature to one environment-configured key on existing CRUD endpoints; excluded managed keys and new API infrastructure. |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

## Story 31.1 — Minimal alternative authentication

Sub-tasks
- [x] Implement a shared validator and integrate both auth gates.
- [x] Document setup, CRUD examples, and the auth boundary.

Test Plan
- Check the exact route/method allowlist, missing configuration, malformed/wrong keys, and unchanged request bodies/responses.

## Story 31.2 — Verification and Regression Checks

Sub-tasks
- [x] Run `pnpm lint` and `pnpm build`.
- [x] Verify cookie-free key auth, session fallback, restricted surfaces, and CRUD wiring with disposable local fixtures.
- [x] Review the diff, run the workflow documentation gate, and ensure no forbidden test files were added.

Test Plan
- Exercise all permitted route/method combinations and reject near-match routes and unsupported methods.
- Verify both proxy and handler guards, allowed/disallowed sessions, no synthetic API session, and unchanged save author handling.
- Use temporary scripts and fixtures outside the repository; report separately any live-provider/OAuth checks that require owner credentials.

## Definition of Done
- Acceptance criteria met and verification limitations reported honestly.
- Dev Log and `docs/PROGRESS.md` updated.

## References
- `docs/stories/story-9.md` — existing GitHub access control.
- `docs/decisions/ADR-vault-api-key.md`.

## Verification Results

- `pnpm lint` passed; `pnpm build` compiled, typechecked, and generated routes using dummy auth/Turso values (auth bypass disabled).
- Temporary external scripts checked all nine allowed route/method pairs through the helper, API guard, and proxy; malformed/wrong/long keys, blank/unset config, exact path/method restrictions, query-string tokens, and allowed/disallowed sessions behaved as expected.
- Actual file handlers performed cookie-free create/read/update/delete against an in-memory storage fixture; API-key saves passed `authorId: null`, session saves retained the user ID, and optional ETags passed through unchanged.
- Actual settings handlers rejected key-only requests without accessing Redis and used the original session user ID for authorized reads/writes (mocked Redis).
- Thirteen real HTTP checks against Next dev with `AUTH_BYPASS=false` verified missing/wrong-key denial, permitted handlers reaching validation, and no key access to settings, AI, tree/refresh, or browser pages. No real storage was mutated.
- Browser smoke at desktop and 375×667 confirmed `/files` redirects to sign-in, the GitHub button is present, no vault content leaks, and no console/page errors occur.
- Live GitHub OAuth and Tigris/Turso/Redis integration were not exercised because no owner credentials were supplied. Existing storage behavior is unchanged. All check scripts stayed in `/tmp`; no test files were added.
