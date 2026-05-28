# Issue 37 — Tools Popup UX Polish

## Type
- bug

## Status
- resolved

## Related Story
- Story 26 — Web Search Tools in AI Chat

## Description
- The tools popup in the chat sidebar has two UX issues:
  1. Opening the popup auto-triggers the nested HoverCard for the first tool (Web Search), showing the providers sub-popover immediately instead of requiring an explicit hover on the chevron.
  2. Redundant description labels appear under the tool name ("Search the web for current information") and under each provider name ("LLM-optimized web search via Parallel AI"), plus a "Providers" header in the sub-popover. These add visual noise.

## Root Cause
- The HoverCard component triggers on pointer-enter with a short delay. When the popover opens, the mouse cursor is already positioned over the tool row, immediately triggering the nested HoverCard.
- Description text was included in the original implementation but is unnecessary given the straightforward tool/provider names.

## Fix / Approach
- Remove tool-level and provider-level description text from the UI.
- Remove the "Providers" header from the sub-popover.
- Prevent the HoverCard from auto-opening when the parent popover first opens.

## Files Changed
- `components/ai-chat/tools-selector/tool-item.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-05-28 | fix | Remove description labels and fix HoverCard auto-open |

## Test Plan
- Open tools popup: nested providers sub-popover should NOT auto-open.
- Hover over chevron: providers sub-popover should appear after hover delay.
- Verify no description text under tool name or provider names.
- Verify no "Providers" header in the sub-popover.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- Story 26 Issues section updated with resolved status.

## References
- `docs/stories/story-26.md`
