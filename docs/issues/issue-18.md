# Issue 18 — AI Route & Component Code Health Cleanup

## Type
- cleanup

## Status
- resolved

## Related Story
- None

## Description
- Four code health improvements: remove a stale comment, deduplicate the `clampText` helper across AI routes, decompose the complex `move/route.ts` POST handler, and decompose the oversized `SidebarChat` component.

## Root Cause
- `clampText` was copy-pasted into two AI route files with minor variations (ellipsis behavior).
- The `move/route.ts` POST handler grew to ~145 lines mixing folder-move and file-move logic inline.
- `SidebarChat` grew to 1349 lines with no sub-component extraction.
- A stale inline comment described `clearChat` as "exposed to parent" when the public API is already documented by the `SidebarChatHandle` type.

## Fix / Approach
1. Remove stale comment `// Clear chat function exposed to parent` in `sidebar-chat.tsx`.
2. Extract `clampText` to `lib/ai/text-utils.ts` with an `{ trailingEllipsis? }` option; update both AI route files.
3. Extract `moveFolderInS3` and `moveFileInS3` private helpers in `move/route.ts`, leaving the POST handler as a thin dispatcher.
4. Extract `ChatErrorBanner`, `ChatComposer`, and `ModelSelectorPopover` sub-components from `SidebarChat`, keeping all state in the parent.

## Files Changed
- `lib/ai/text-utils.ts` (new)
- `app/api/ai/action/route.ts`
- `app/api/ai/chat/route.ts`
- `app/api/fs/move/route.ts`
- `components/ai-chat/sidebar-chat.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-04 | cleanup | Removed stale comment (`clearChat` in sidebar-chat.tsx). Extracted shared `clampText` to `lib/ai/text-utils.ts` with `trailingEllipsis` option; updated both AI routes. Extracted `moveFolderInS3` and `moveFileInS3` helpers in `move/route.ts`; POST handler is now a thin dispatcher. Extracted `ChatErrorBanner`, `ModelSelectorPopover`, and `ChatComposer` sub-components from `SidebarChat`; all state retained in parent. Lint + build pass. |

## Test Plan
- `pnpm lint` passes.
- `pnpm build` passes.
- Manual: AI chat and action routes work, file/folder move works, sidebar chat UI renders correctly.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `TMP.md` — source of the four issues
