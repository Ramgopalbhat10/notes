# Issue 45 — Install Impeccable design skill and run init

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- Add the `impeccable` AI design skill to the repository via `npx impeccable install` and run the `/impeccable init` setup flow so the project has a shared `PRODUCT.md` and optional `DESIGN.md` context for future UI work.

## Root Cause
- The repo did not have the Impeccable design skill installed, so AI-assisted UI polish lacked the project's audience, brand lane, voice, and anti-reference context.

## Fix / Approach
- Ran `npx impeccable install` from the project root; it installed skill files for the detected harnesses (`.agents`, `.github`, `.gemini`) plus hook manifests for `.codex` and `.github`.
- Kept only the Devin-facing `.agents/skills/impeccable/` copy and removed the `.github/skills/`, `.gemini/`, `.codex/`, and `.github/hooks/impeccable.json` copies per project preference.
- Invoked `/impeccable init` and wrote `PRODUCT.md` treating the surface as a web product with a calm, focused, trustworthy personality.
- Configured live mode by writing `.impeccable/live/config.json` and running CSP detection (no CSP present).
- Added `.impeccable/live/sessions/` to `.gitignore` so live-mode recovery state is not committed.
- Ran `pnpm install`, `pnpm lint`, and `pnpm build`; all passed.

## Files Changed
- `.agents/skills/impeccable/`
- `.impeccable/live/config.json`
- `.gitignore`
- `PRODUCT.md`
- `docs/issues/issue-45.md`
- `docs/issues/README.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-07-15 | chore | Install Impeccable skill and run init |

## Test Plan
- Confirm the skill files are written under a supported Devin skill directory.
- Confirm `PRODUCT.md` is generated and contains the product type, audience, lane, voice, and anti-references.
- Run `pnpm lint` and `pnpm build`; both passed.

## Definition of Done
- Fix verified (`pnpm lint` and `pnpm build` passed; all PR checks green).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- https://impeccable.style
- https://github.com/pbakaus/impeccable
