# Issue 29 — BlockNote 0.48 + Mantine 8.3.18 Upgrade

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- Upgrade `@blocknote/core`, `@blocknote/mantine`, and `@blocknote/react` from 0.42.3 to 0.48.1.
- Upgrade `@mantine/core` and `@mantine/hooks` from 8.3.8 to 8.3.18 (patch).

## Root Cause
- BlockNote 0.42 was behind the latest release (0.48) with bug fixes and improvements.
- Mantine 8.3.8 had minor patch updates available (8.3.18).

## Fix / Approach
- Installed `@blocknote/*@0.48.1`, `@mantine/core@8.3.18`, `@mantine/hooks@8.3.18`.
- Mantine 9 was attempted but reverted — `@blocknote/mantine@0.48.1` requires `@mantine/core@^8.3.11`.
- Shiki 4 was attempted but reverted — `streamdown` and `@streamdown/code` require `shiki@^3`.
- Verified `.bn-container` CSS in `globals.css` is layout-only (min-height), not theme-related, so no rename to `.bn-root` needed.
- No code changes required — all existing APIs remain compatible.

## Files Changed
- `package.json`
- `pnpm-lock.yaml`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-17 | chore | Upgraded BlockNote 0.42→0.48, Mantine 8.3.8→8.3.18. Mantine 9 and Shiki 4 blocked by peer deps. |

## Test Plan
- `pnpm lint` passes.
- `pnpm build` passes.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- [BlockNote Changelog](https://github.com/TypeCellOS/BlockNote/releases)
- [Mantine 8.x Changelog](https://mantine.dev/changelog/8-3-18/)
