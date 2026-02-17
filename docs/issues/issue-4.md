# Issue 4 — Weak Secret Redaction Mechanism in AI Chat Context

## Type
- bug

## Status
- resolved

## Related Story
- None

## Description
The AI chat context redaction in `app/api/ai/chat/route.ts` uses a narrow keyword regex and simplistic line parsing, which can miss secrets with different naming conventions or structured formats. This risks leaking sensitive data from file excerpts into model prompts.

## Root Cause
`redactSecrets()` relies on a small keyword list and only redacts values around `=` or `:`, so tokens in common real-world forms (headers, PEM blocks, URL credentials, JWTs, and provider-specific keys) can bypass redaction.

## Fix / Approach
- Expand redaction with layered detection:
  - broader key-name matching for sensitive fields
  - format-based token matching (JWT, provider keys, bearer tokens, private keys)
  - URL credential redaction
- Keep context usefulness by preserving non-sensitive structure while replacing sensitive values with `[REDACTED]`
- Validate by lint/build and manual redaction scenarios

## Files Changed
- `app/api/ai/chat/route.ts`
- `docs/issues/README.md`
- `docs/issues/issue-4.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-17 | fix | Hardened AI chat context redaction with broader key detection, token/credential format redaction, and URL/private-key protection; validated with lint and build |

## Test Plan
- Manual: verify redaction for key/value pairs with varied naming (`client_secret`, `auth_token`, `private_key`)
- Manual: verify redaction for JWTs, bearer tokens, URL-embedded credentials, and PEM private keys
- Run `pnpm lint`
- Run `pnpm build`

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- Security task: `docs/TASK.md`
