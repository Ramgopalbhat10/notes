# Issue 49 — API-key comparison and PR workflow failures

## Type
- bug

## Status
- resolved

## Related Story
- Story 31 — `docs/stories/story-31.md`

## Description
- PR #126 at `2b54be6` triggered CodeQL `js/insufficient-password-hash` on `NOTES_API_KEY` and failed `verify-workflow-gates` before lint/build.

## Root Cause
- The key validator SHA-256 hashed the environment secret solely to produce equal-length buffers for comparison. CodeQL treats this as an insufficient-effort credential hash; no hash needs to be created or stored for a configured random bearer key.
- The PR tool publishes the remote `anton/i-want-to-make-the-repo-api-ready-so-tha-5bc4da` branch even though local work uses `feature/personal-vault-api-key`. CI validates the remote `github.head_ref`, but the prefix allowlist recognized `cursor/` and not `anton/`.
- Public GitHub annotations identify the failed documentation step; full logs require sign-in. The exact CI command reproduced the branch-prefix error locally.

## Fix / Approach
- Compare UTF-8 key buffers directly with `timingSafeEqual` after rejecting unequal byte lengths. Remove key hashing rather than introducing a password KDF, suppression, or dependency. Keep the route/method allowlist and session fallback unchanged.
- Recognize tool-managed `anton/` branches in the workflow checker and synchronize the primary agent instructions/skill. Keep `main` and unrelated prefixes rejected for implementation changes.
- Update the authentication ADR and capture the actual remote-branch check as a workflow learning.

## Files Changed
- `lib/auth/api-key.ts`
- `scripts/workflow/check-workflow-docs.mjs`
- `AGENTS.md`, `.agents/skills/notes-workflow/SKILL.md`
- `docs/decisions/ADR-vault-api-key.md`
- `docs/stories/story-31.md`, issue/index/progress, and workflow learning docs

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-10-19 | verify | Lint/build and rebuilt auth/CRUD/settings fixtures passed, including unequal-length and multibyte key cases. Staged and exact CI Anton-head documentation commands passed; main/unknown prefixes still failed. CodeQL CLI is unavailable locally; GitHub analysis must confirm the removed hashing alert after push. |
| 2026-10-19 | fix | Removed SHA-256 key hashing in favor of direct timing-safe buffer comparison with a byte-length guard; allowed remote Anton task branches and synchronized agent/decision/learning docs. |
| 2026-10-19 | investigate | Matched the CodeQL annotation to the SHA-256 secret hash and reproduced CI's rejected remote Anton branch; no failure in the CRUD route boundary was found. |

## Tasks
- [x] Replace key hashing with timing-safe byte comparison and synchronize the ADR.
- [x] Accept tool-managed Anton branches without relaxing other workflow checks.
- [x] Run lint/build, key/session/CRUD regression checks, and the CI documentation command with actual remote head_ref.
- [x] Verify invalid/main branches remain rejected and no forbidden test files are added.

## Test Plan
- All nine allowed route/method pairs still work; missing/malformed/wrong/short/long keys and unset/blank config reject safely without length exceptions.
- Verify exact byte comparison, including non-ASCII/multibyte values, case sensitivity, session fallback, and unrelated-route denial.
- Re-run temporary auth and note/settings handler fixtures outside the repository.
- Run `pnpm lint`, `pnpm build` with dummy provider/auth env and auth bypass disabled, and `pnpm run workflow:check-docs -- --base=origin/main --head=HEAD --branch=anton/i-want-to-make-the-repo-api-ready-so-tha-5bc4da` after committing.
- Verify allowed human/Cursor branches and denied `main`/unrecognized branches. Do not claim a local CodeQL scan if its CLI is unavailable; GitHub will rerun analysis after pushing.

## Definition of Done
- Fix verified, tracking and cross-references updated, and existing PR updated.

## References
- PR: https://github.com/Ramgopalbhat10/notes/pull/126
- Failed workflow: https://github.com/Ramgopalbhat10/notes/actions/runs/39201903942/job/117896445747
- CodeQL annotation: https://github.com/Ramgopalbhat10/notes/runs/117896564541
- CodeQL rule: https://codeql.github.com/codeql-query-help/javascript/js-insufficient-password-hash
- Node comparison contract: https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b

## Verification Results

- `pnpm lint` and `pnpm build` passed with dummy auth/GitHub/Turso env, auth bypass disabled.
- All nine key route/method pairs passed; wrong, equal-length wrong, short/long, unset/blank, malformed, and UTF-8 byte-length cases passed. Rebuilt auth/proxy and file/settings fixtures confirmed session fallback, nullable key authors, unchanged CRUD, and unrelated-route denial.
- Exact GitHub CI documentation command with remote `anton/i-want-to-make-the-repo-api-ready-so-tha-5bc4da` and staged documentation gate passed. Human/Cursor prefixes remained accepted, and implementation diffs on `main` or unknown prefixes remained rejected.
- No local CodeQL CLI is installed; no local scan is claimed. The flagged hash call was removed entirely without a suppression. GitHub CodeQL must rerun on the updated commit.
- No real OAuth/storage/provider integration was performed or real vault data mutated. No test files were added.
