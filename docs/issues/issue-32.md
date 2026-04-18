# Issue 32 — Redesign Chat Sidebar Model Selector

## Type
- refactor

## Status
- resolved

## Related Story
- None

## Description
- The model selector in the chat sidebar (trigger in the composer bottom bar and the Radix popover above it) did not match the polish of the rest of the app. The trigger was a bare model name in a muted pill, the popover header was boxed like a form, the provider filter wrapped as long text pills that truncated awkwardly in the ~24rem sidebar width, and the list rows had a bordered pill around the capability icons that read noisy next to the row chrome. The overall feel was "admin table" rather than the Linear/Notion-style command-palette feel we want.

## Root Cause
- The component was built for correctness first (search, filters, grouping, a11y, mobile portal) without a dedicated visual pass. Capability icons were wrapped in a bordered chip to separate them from the name; the provider filter row only had text, so each chip had to be wide; and the group headers were plain labels. No provider identity (avatar/glyph) was carried into the trigger or rows, so users could not scan by provider.

## Fix / Approach
- Introduce a small deterministic `ProviderAvatar` glyph derived from the provider string (initial + stable tint from existing theme tokens) and reuse it in the trigger, the provider filter row, and each model row.
- Rebuild the popover header as a flush command-palette-style row (borderless search + subtle filter-toggle icon, thin divider below).
- Replace the text-pill provider filter with horizontally scrolling circular avatar chips ("All" bubble + one per provider, tooltip = provider label).
- Make the feature filter chips tighter (icon + label, no border unless active).
- Redesign model rows: `[ProviderAvatar] [name] … [capability icons] [check]`, selected state uses the accent background + 2px left accent stripe, and the bordered pill around capability icons is removed.
- Make provider group headers uppercase, tracking-wide, muted, and sticky at the top of the scroll container so the current provider stays visible while scanning.
- Preserve all existing behavior: search, filter reset on close, focus-on-open, mobile portal into the sheet, wheel-to-horizontal-scroll on filter rows, selection handler, keyboard/tab order.
- Explicitly drop the details hover card (not wanted in the narrow sidebar per issue requester).

## Files Changed
- `components/ai-chat/model-selector/utils.ts`
- `components/ai-chat/model-selector/provider-avatar.tsx` (new)
- `components/ai-chat/model-selector/index.tsx`
- `components/ai-chat/model-selector/model-filters.tsx`
- `components/ai-chat/model-selector/model-list.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-18 | refactor | Redesigned chat sidebar model selector with ProviderAvatar glyphs, flush search header, avatar-based provider filter chips, sticky group headers, and cleaner row layout while preserving all existing behavior. |

## Test Plan
- Manual: open the chat sidebar, click the model trigger, verify the avatar+name trigger renders in both light and dark mode.
- Manual: open the popover and confirm the search input is focused automatically on desktop.
- Manual: type a query and confirm filtering by model name, id, and provider still works.
- Manual: toggle the filter button and confirm the avatar provider row and feature row render; pick a provider and a feature and confirm the list narrows correctly.
- Manual: scroll the list with multiple provider groups and confirm group headers are sticky and readable.
- Manual: select a non-default model and confirm the accent-bg + left-stripe + check state renders and the trigger updates.
- Manual: resize to mobile widths and verify the popover still mounts inside the sheet and remains usable.
- `pnpm lint` and `pnpm build` pass.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- Reference inspiration: t3.chat model picker (screenshot attached on issue request).
