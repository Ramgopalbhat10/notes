# Issue 23 — Implement Phase 1 personal-vault performance plan

## Type
- performance

## Status
- resolved

## Related Story
- None

## Description
- The Phase 1 personal-vault performance plan targets multiple hot paths that still do more work than necessary for a single-user markdown vault.
- Current bottlenecks include full-document editor serialization on typing, synchronous manifest persistence on save, full-tree search recomputation, repeated slug-map rebuilding, startup settings round trips, chat autoscroll polling, and repeated derived-content parsing.
- The goal is to make common file open, edit, save, tree, outline, sharing, and AI flows feel instant without changing current user-visible behavior.

## Root Cause
- Several request and UI hot paths still perform full-document or full-vault work during common interactions instead of limiting that work to explicit refreshes or debounced background operations.
- Manifest and slug lookup paths do avoidable repeated computation that grows with vault size.
- Some client flows still block on unnecessary network or DOM polling work.

## Fix / Approach
- Remove full-document markdown serialization and block-by-block selection offset conversion from the BlockNote typing path, while keeping markdown conversion only for save, AI application, and draft persistence boundaries.
- Move manifest durability work off the synchronous file-save request path while preserving file write behavior, ETag handling, and manifest schema.
- Precompute and reuse indexed tree-search and slug-resolution data from manifest loads instead of recomputing across the whole tree or manifest on each interaction.
- Use local settings bootstrap for last-file restore, cache derived outline/preview data by content revision, and replace chat streaming autoscroll polling with ref-driven scrolling.
- Preserve existing route contracts, sharing behavior, public note routing, and current UI semantics.

## Subtasks
- [x] Optimize the editor hot path and file-open hydration behavior.
- [x] Remove synchronous full-manifest persistence from the save path while preserving manifest correctness.
- [x] Optimize tree hydrate, tree search, and slug/public-file resolution.
- [x] Remove avoidable startup round trips and repeated outline/preview parsing work.
- [x] Replace chat autoscroll polling and tighten sharing-state reuse.
- [x] Batch bulk-operation invalidation/metadata work where folder-level invalidation is sufficient.
- [x] Run `pnpm lint` and `pnpm build`.
- [x] Update issue/progress docs when the unit is complete.

## Files Changed
- `app/actions/documents.ts`
- `app/api/fs/folder/route.ts`
- `components/blocknote-editor.tsx`
- `components/file-tree/index.tsx`
- `components/markdown-editor.tsx`
- `components/vault-workspace/hooks/use-ai-session.ts`
- `components/vault-workspace/index.tsx`
- `components/vault-workspace/sections/workspace-body.tsx`
- `components/ai-chat/hooks/use-chat-session.ts`
- `components/ai-chat/utils.ts`
- `stores/editor.ts`
- `stores/settings.ts`
- `stores/public.ts`
- `app/files/[[...path]]/page.tsx`
- `lib/cache/manifest-store.ts`
- `lib/content/markdown-outline.ts`
- `lib/content/slug-map.ts`
- `lib/content/slug-resolver.ts`
- `lib/fs/file-meta.ts`
- `lib/manifest-updater.ts`
- `lib/tree-refresh.ts`
- `lib/tree/state-from-manifest.ts`
- `lib/tree/store-actions.ts`
- `lib/tree/types.ts`
- `lib/tree/utils.ts`
- `stores/tree.ts`
- `docs/decisions/ADR-caching-strategy.md`
- `docs/issues/issue-23.md`
- `docs/issues/README.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-28 | perf | Opened Issue 23 from `docs/plans/2026-03-27-phase-1-performance-plan-personal-vault.md`, switched to `refactor/phase-1-personal-vault-performance`, and began implementing the scoped Phase 1 hot-path optimizations. |
| 2026-03-28 | perf | Finished the Phase 1 performance plan: tree search and slug indexes now reuse manifest-derived data, editor typing/save no longer depend on per-keystroke full-document serialization, settings/bootstrap and outline/chat hot paths are locally cached, manifest persistence is debounced off the save path, folder metadata deletes are batched, and `pnpm lint` plus `pnpm build` pass. |

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build`.
- Manually verify cached file open, typing, save, tree search, public slug routing, outline updates, AI chat autoscroll, sharing-state reuse, and folder move/delete behavior.
- Compare save and search responsiveness before and after the hot-path changes on representative personal-vault sizes.

## Definition of Done
- The Phase 1 performance hotspots are implemented without changing existing route contracts or user-visible behavior.
- Lint and build pass.
- Status set to `resolved` when all scoped work is complete.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `docs/plans/2026-03-27-phase-1-performance-plan-personal-vault.md`
- `components/blocknote-editor.tsx`
- `app/api/fs/file/route.ts`
- `lib/manifest-updater.ts`
- `components/file-tree/index.tsx`
- `lib/content/slug-resolver.ts`
- `app/files/[[...path]]/page.tsx`
- `components/ai-chat/hooks/use-chat-session.ts`
