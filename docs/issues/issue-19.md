# Issue 19 — SidebarChat Decomposition & Simplification

## Type
- refactor

## Status
- in-progress

## Related Story
- None

## Description
- `components/ai-chat/sidebar-chat.tsx` is a 1564-line monolith with 12 useEffects, 10 useMemos, 10 useCallbacks, and 8 useStates in the main component alone. ~50% of the complexity is model selector state that gets prop-drilled through `ChatComposer` (38 props). The component needs decomposition into a feature-module following the `file-tree/` pattern.

## Root Cause
- Model selector UI state (search, filters, loading, caching) is managed in the parent and prop-drilled through `ChatComposer` (38 props) to `ModelSelectorPopover` (20+ props).
- Chat session singleton, model caching, and auto-scroll logic are all inline in the same file.
- Sub-components (`ChatErrorBanner`, `ChatComposer`, `ModelSelectorPopover`, `ChatMessageRow`) were extracted but remain in the same file with no hook extraction.

## Fix / Approach
1. Extract types and pure utilities to `types.ts` and `utils.ts`.
2. Extract `useChatSession` hook — wraps global transport singleton + `useSyncExternalStore` + `useChat`.
3. Extract `useModels` hook — model loading, localStorage caching, validation.
4. Create self-contained `model-selector/` module — reads `useChatStore` directly, owns all internal state.
5. Extract `ChatMessageRow`, `ChatErrorBanner`, `ChatEmptyState` to own files.
6. Rewrite `ChatComposer` with ~8 props (down from 38), embedding `ModelSelector` as child.
7. Simplify auto-scroll from 3-effect pinned-to-top to simple scroll-to-bottom.
8. Rewrite `sidebar-chat.tsx` as thin ~150-line orchestrator.

Target structure:
```
components/ai-chat/
  index.tsx
  sidebar-chat.tsx            (~150 lines, thin orchestrator)
  chat-message.tsx
  chat-composer.tsx           (~8 props)
  chat-error-banner.tsx
  chat-empty-state.tsx
  model-selector/
    index.tsx                 (self-contained, owns state)
    model-list.tsx
    model-filters.tsx
    types.ts
    utils.ts
  hooks/
    use-chat-session.ts
    use-models.ts
  types.ts
  utils.ts
```

## Files Changed
- `components/ai-chat/sidebar-chat.tsx` (rewritten)
- `components/ai-chat/index.tsx` (new)
- `components/ai-chat/types.ts` (new)
- `components/ai-chat/utils.ts` (new)
- `components/ai-chat/chat-message.tsx` (new)
- `components/ai-chat/chat-error-banner.tsx` (new)
- `components/ai-chat/chat-empty-state.tsx` (new)
- `components/ai-chat/chat-composer.tsx` (new)
- `components/ai-chat/hooks/use-chat-session.ts` (new)
- `components/ai-chat/hooks/use-models.ts` (new)
- `components/ai-chat/model-selector/index.tsx` (new)
- `components/ai-chat/model-selector/model-list.tsx` (new)
- `components/ai-chat/model-selector/model-filters.tsx` (new)
- `components/ai-chat/model-selector/types.ts` (new)
- `components/ai-chat/model-selector/utils.ts` (new)

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-04 | refactor | Decomposed 1564-line sidebar-chat.tsx into feature-module. Extracted types.ts, utils.ts, hooks/use-chat-session.ts, hooks/use-models.ts, model-selector/ (index.tsx, model-list.tsx, model-filters.tsx, types.ts, utils.ts), chat-message.tsx, chat-error-banner.tsx, chat-empty-state.tsx, chat-composer.tsx (10 props, down from 38), index.tsx barrel. Simplified auto-scroll from 3-effect pinned-to-top to scroll-to-bottom. ModelSelector is now self-contained (reads useChatStore directly). sidebar-chat.tsx is now ~170 lines. Lint + build pass. |

## Test Plan
- `pnpm lint` passes.
- `pnpm build` passes.
- Manual: sidebar chat renders, model selector works (search, filter, select), streaming works, copy/insert/regenerate work, context file chip works, clear chat works.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- Plan: `.windsurf/plans/sidebar-chat-decomposition-b7aa77.md`
- Pattern reference: `components/file-tree/` module structure
