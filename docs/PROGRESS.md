# Progress

Current issue: `docs/issues/issue-29.md`

Current section: Chore — BlockNote 0.48 + Mantine 8.3.18 Upgrade

Previous tasks (latest completed batch only):
- [x] Upgraded `@blocknote/core`, `@blocknote/mantine`, `@blocknote/react` from 0.42.3 to 0.48.1.
- [x] Upgraded `@mantine/core` and `@mantine/hooks` from 8.3.8 to 8.3.18.
- [x] Attempted Mantine 9 — reverted due to `@blocknote/mantine` peer dep requiring `@mantine/core@^8.3.11`.
- [x] Attempted Shiki 4 — reverted due to `streamdown`/`@streamdown/code` requiring `shiki@^3`.
- [x] Verified `.bn-container` CSS is layout-only (no rename to `.bn-root` needed).
- [x] Verified lint and build pass.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `chore/1776424025-blocknote-mantine-shiki-upgrade`
- Mantine 9 blocked by `@blocknote/mantine@0.48.1` peer dep (`@mantine/core@^8.3.11`).
- Shiki 4 blocked by `streamdown@2.5.0` and `@streamdown/code@1.1.1` dep (`shiki@^3`).
- No code changes required — all APIs remain compatible.
