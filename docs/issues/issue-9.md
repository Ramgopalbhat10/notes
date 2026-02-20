# Issue 9 — Refactor Manifest Updater to a Class

## Type
- refactor

## Status
- in-progress

## Related Story
- None

## Description
- The logic for manually updating the manifest JSON is scattered and complex. A more structured approach (e.g., a Manifest class) would improve reliability.

## Root Cause
- The current implementation in `lib/manifest-updater.ts` uses scattered functions passing the manifest object around. Grouping this logic into a class encapsulating the manifest data and its operations provides a safer, more cohesive API.

## Fix / Approach
- Create a `Manifest` class wrapping `FileTreeManifest`.
- Move `computeChecksum`, `ensureParentFolders`, `addChildToParent`, `removeChildFromParent`, `sortManifest`, etc., as private or public methods on this class.
- Update `addOrUpdateFile`, `addFolder`, `deleteFile`, `deleteFolder`, `moveFile`, `moveFolder` to use the new `Manifest` class methods.

## Files Changed
- `lib/manifest-updater.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-20 | refactor | Refactored `Manifest` updates into a dedicated class encapsulating `FileTreeManifest` data and associated operations. |

## Test Plan
- Run `pnpm lint` and `pnpm build` to verify no types or builds are broken.
- Ensure the external API of `lib/manifest-updater.ts` remains the same (i.e., exporting the same async functions like `addOrUpdateFile`, etc.).

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- None
