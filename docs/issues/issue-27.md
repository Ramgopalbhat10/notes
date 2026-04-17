# Issue 27 — Audit and Update NPM Packages

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- Audit all production and development dependencies for newer versions, analyze breaking changes, check peer dependency conflicts, and apply safe updates.

## Root Cause
- Dependencies were falling behind latest versions, accumulating security fixes, bug fixes, and performance improvements.

## Fix / Approach
- Identified 44 outdated packages across 3 tiers (patch, minor, major).
- Applied all Tier 1 (patch) and Tier 2 (minor) updates as a batch.
- Applied Tier 3 tooling updates: `dotenv` 17, `idb` 8, `lucide-react` 1.x, `@libsql/client` 0.17.
- Reverted `typescript` 6 and `eslint` 10 due to ecosystem peer dependency conflicts (`@typescript-eslint` requires TS <6, `eslint-plugin-import/react/jsx-a11y` requires ESLint ^9).
- Fixed `dotenv` 17 breaking change (`quiet` now defaults to `false`) in `drizzle.config.ts` and `scripts/build-file-tree.ts`.
- Resolved `mermaid` version mismatch between `@streamdown/mermaid` and `streamdown` via `pnpm dedupe`.
- Deferred major framework upgrades (AI SDK 6, BlockNote 0.48, Mantine 9, react-resizable-panels 4) to separate PRs.

## Files Changed
- `package.json`
- `pnpm-lock.yaml`
- `drizzle.config.ts`
- `scripts/build-file-tree.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-17 | chore | Applied Tier 1+2 safe updates and Tier 3 tooling updates; fixed dotenv and mermaid issues |

## Test Plan
- `pnpm lint` passes.
- `pnpm build` passes.
- CI workflow-gates pass.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- Audit report shared with user before applying changes.
- TypeScript 6 blocked by: `@typescript-eslint` peer dep `typescript >=4.8.4 <6.0.0`.
- ESLint 10 blocked by: `eslint-plugin-import`, `eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks` peer deps (max `^9`).
