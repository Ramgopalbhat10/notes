---
title: refactor: Phase 1 performance plan for a personal markdown vault
type: refactor
date: 2026-03-27
---

# ♻️ Refactor: Phase 1 performance plan for a personal markdown vault

## Overview

This plan narrows performance work to the current real-world usage target:

- single device
- single tab
- no multi-device conflict handling
- no cross-tab invalidation
- vault size below `10k` notes

The goal is to make the app feel instant for the current functionality set: file open, typing, save, tree search, outline, sharing, and AI actions. This phase deliberately avoids adding distributed consistency machinery or large-vault partitioning work.

## Problem Statement / Motivation

The current app architecture already has strong caching foundations, but several hot paths still do more work than necessary for a personal notes workflow:

- edit mode currently performs full-document serialization work in [components/blocknote-editor.tsx](/home/jarvis/projects/mrgb/notes/components/blocknote-editor.tsx#L41) and [components/blocknote-editor.tsx](/home/jarvis/projects/mrgb/notes/components/blocknote-editor.tsx#L103)
- file saves still pay synchronous manifest mutation and persistence cost through [app/api/fs/file/route.ts](/home/jarvis/projects/mrgb/notes/app/api/fs/file/route.ts#L141) and [lib/manifest-updater.ts](/home/jarvis/projects/mrgb/notes/lib/manifest-updater.ts#L131)
- tree filtering recomputes through the full tree on each search update in [components/file-tree/index.tsx](/home/jarvis/projects/mrgb/notes/components/file-tree/index.tsx#L176)
- public slug resolution rebuilds a slug map from the full manifest in [lib/content/slug-resolver.ts](/home/jarvis/projects/mrgb/notes/lib/content/slug-resolver.ts#L29)
- startup still does avoidable settings fetch work in [app/files/[[...path]]/page.tsx](/home/jarvis/projects/mrgb/notes/app/files/[[...path]]/page.tsx#L60)
- chat autoscroll still polls the DOM while streaming in [components/ai-chat/hooks/use-chat-session.ts](/home/jarvis/projects/mrgb/notes/components/ai-chat/hooks/use-chat-session.ts#L168)

None of these require business-logic changes to optimize. They are primarily request-path and UI hot-path inefficiencies.

## Proposed Solution

Keep Phase 1 focused on one rule:

> No common request or interaction should do full-document or full-vault work unless it is an explicit refresh operation.

This phase will optimize the current architecture rather than replacing it.

## Technical Plan

### 1. Editor hot path: make typing and selection incremental

- Remove full-document markdown serialization from the keystroke path in [components/blocknote-editor.tsx](/home/jarvis/projects/mrgb/notes/components/blocknote-editor.tsx#L103).
- Stop recomputing selection offsets by iterating blocks and converting each block back to markdown in [components/blocknote-editor.tsx](/home/jarvis/projects/mrgb/notes/components/blocknote-editor.tsx#L41).
- Keep selection in BlockNote-native form or track by block identifiers only.
- Convert editor state back to markdown only when needed for:
  - explicit save
  - AI apply operations
  - debounced local draft persistence
- Make initial markdown hydration respond to file changes, not just editor mount.

### 2. Save path: remove synchronous full-manifest persistence

- Keep file writes, ETag flow, and current API responses unchanged.
- Change synchronous save behavior so request handling updates the hot manifest state in Redis or in-memory first.
- Move durable full-manifest snapshot persistence to a debounced background flush instead of doing it on every save.
- Keep explicit tree refresh as the only operation that is allowed to do full-vault rebuild work in normal operation.
- Preserve the current manifest schema and current route contracts.

### 3. Tree search and tree hydrate: avoid full-tree recomputation

- Precompute normalized search text for each node when the manifest is loaded.
- Remove redundant client-side sorting during hydrate in [lib/tree/state-from-manifest.ts](/home/jarvis/projects/mrgb/notes/lib/tree/state-from-manifest.ts#L13) when the manifest is already stored sorted.
- Replace recursive tree filtering in [components/file-tree/index.tsx](/home/jarvis/projects/mrgb/notes/components/file-tree/index.tsx#L176) with indexed matching plus ancestor reveal logic.
- Keep debounced search, but ensure the debounced work scales with matching nodes rather than all nodes.

### 4. Slug and public-file resolution: cache the lookup index

- Build the `slug -> key` index once per manifest load.
- Store that lookup index with the manifest cache record instead of rebuilding it per resolve in [lib/content/slug-resolver.ts](/home/jarvis/projects/mrgb/notes/lib/content/slug-resolver.ts#L29).
- Reuse the cached slug map for public routing in [app/p/[[...path]]/page.tsx](/home/jarvis/projects/mrgb/notes/app/p/[[...path]]/page.tsx#L36).
- Preserve public note behavior exactly as it works today.

### 5. Startup and file-open flow: remove avoidable round trips

- Eliminate the extra initial `/api/settings` request used only to decide whether to restore the last file in [app/files/[[...path]]/page.tsx](/home/jarvis/projects/mrgb/notes/app/files/[[...path]]/page.tsx#L60).
- Persist the needed setting locally in the settings store and bootstrap from local state first.
- Refresh settings from the server in the background rather than blocking last-file restoration on the round trip.
- Keep file-open behavior driven by local caches plus one conditional file fetch when needed.

### 6. Outline and preview: keep derived parsing bounded

- Cache parsed outline results per content revision so the same note content is not reprocessed unnecessarily.
- Only build outline data when preview or outline UI actually needs it.
- Keep preview normalization and outline generation memoized by stable content revision rather than rerender count.

### 7. AI and sharing: remove polling-style or redundant client work

- Replace streaming chat autoscroll interval logic in [components/ai-chat/hooks/use-chat-session.ts](/home/jarvis/projects/mrgb/notes/components/ai-chat/hooks/use-chat-session.ts#L168) with ref-driven scroll behavior.
- Cache excerpt and digest values per open note revision so they are not recomputed unnecessarily.
- Reuse cached sharing state in [stores/public.ts](/home/jarvis/projects/mrgb/notes/stores/public.ts#L31) when revisiting the same file quickly.
- Keep current AI request and sharing behavior unchanged.

### 8. Bulk operations: keep folder actions responsive enough for personal use

- Batch invalidation and metadata work for folder move/delete operations.
- Avoid issuing one cache revalidation call per file when a folder-level invalidation is sufficient.
- Keep correctness for current UI flows without introducing a background job system.

## Acceptance Criteria

- [ ] Opening a cached file feels instant and usually avoids visible loading.
- [ ] Typing and selection in large notes no longer lag due to full-document conversion.
- [ ] Save latency depends mainly on the current note write, not the total vault size.
- [ ] Tree search remains responsive with a vault up to `10k` notes.
- [ ] Public note slug resolution no longer rebuilds the full slug map per request.
- [ ] Startup no longer blocks last-file restoration on an extra settings fetch.
- [ ] AI sidebar and outline sidebar do not introduce noticeable UI jank while open.
- [ ] Folder move/delete remains responsive for realistic personal-vault batch sizes.

## Test Plan

### Editor and file open

- Benchmark edit mode with notes around `100KB`, `300KB`, `500KB`, and `1MB`.
- Verify typing, cursor movement, and selection remain smooth.
- Measure file open times for:
  - first open after reload
  - repeat open from cache
  - open after save

### Save path

- Measure save latency before and after manifest-path changes on vaults with roughly:
  - `1k` notes
  - `5k` notes
  - `10k` notes
- Verify save time no longer grows with whole-manifest persistence on each request.

### Tree, slug, and public routing

- Benchmark tree search latency near `10k` notes.
- Verify tree filtering remains responsive while preserving the same visible results.
- Verify public note routing and slug resolution continue to return the same file as before.

### Folder operations and sidebars

- Benchmark folder move/delete with `100`, `500`, and `1k` files.
- Verify chat sidebar autoscroll still behaves correctly without interval polling.
- Verify outline panel still updates correctly for changed content and active note switches.

## Risks / Tradeoffs

- Moving full-manifest persistence off the request path improves responsiveness, but it introduces a short delay between hot cache updates and durable snapshot persistence.
- Editor-path optimization must not break markdown fidelity when converting from BlockNote state back to markdown.
- Search-index optimization must preserve current tree search semantics and ancestor visibility behavior.

## References

- Editor hot path: [components/blocknote-editor.tsx](/home/jarvis/projects/mrgb/notes/components/blocknote-editor.tsx#L16)
- Save route: [app/api/fs/file/route.ts](/home/jarvis/projects/mrgb/notes/app/api/fs/file/route.ts#L119)
- Manifest updater: [lib/manifest-updater.ts](/home/jarvis/projects/mrgb/notes/lib/manifest-updater.ts#L121)
- Tree filter logic: [components/file-tree/index.tsx](/home/jarvis/projects/mrgb/notes/components/file-tree/index.tsx#L176)
- Tree hydrate logic: [lib/tree/state-from-manifest.ts](/home/jarvis/projects/mrgb/notes/lib/tree/state-from-manifest.ts#L13)
- Slug resolver: [lib/content/slug-resolver.ts](/home/jarvis/projects/mrgb/notes/lib/content/slug-resolver.ts#L29)
- Files route startup logic: [app/files/[[...path]]/page.tsx](/home/jarvis/projects/mrgb/notes/app/files/[[...path]]/page.tsx#L60)
- Chat session autoscroll: [components/ai-chat/hooks/use-chat-session.ts](/home/jarvis/projects/mrgb/notes/components/ai-chat/hooks/use-chat-session.ts#L168)
- Sharing store cache behavior: [stores/public.ts](/home/jarvis/projects/mrgb/notes/stores/public.ts#L31)
- Settings store bootstrap: [stores/settings.ts](/home/jarvis/projects/mrgb/notes/stores/settings.ts#L25)

## Notes

- This plan intentionally excludes cross-tab invalidation, multi-device conflict handling, and large-vault partitioning.
- Phase 2 and Phase 3 scalability work are out of scope for now.
- The optimization target is perceived instant response for the current feature set, not long-term distributed-scale architecture.
