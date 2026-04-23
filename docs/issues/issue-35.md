# Issue 35 — Tighten Assistant Refine Panel Chrome

## Type
- fix

## Status
- resolved

## Related Story
- None

## Description
- The assistant refine panel showed a passive "Acting on ..." context hint under the action toolbar, used a tall refine textarea, and displayed a visible keyboard shortcut hint below the composer. In the narrow sidebar these elements added visual noise and consumed vertical space around the draft preview.

## Root Cause
- The refine surface kept helper chrome from the earlier assistant layout even after the action state and model selector made the context and submit affordance clear enough without additional text.

## Fix / Approach
- Remove the passive context hint row while preserving active status/error/streaming messages.
- Reduce the refine textarea to a compact single-line height.
- Remove the visible keyboard shortcut hint below the composer while preserving the existing Cmd/Ctrl+Enter submit behavior.
- Suppress the streaming status text in the compact assistant header.
- Tighten the assistant header controls and remove the draft preview height cap so the draft body fills the available panel space.
- Keep the refine input border visually static when focused.
- Move draft apply/regenerate actions into the AI draft card header as compact controls so they no longer consume vertical preview space.
- Replace side-by-side compare with a vertical split inside the same AI draft card, separated by a resizable horizontal handle.
- Collapse the refine composer into a single compact row with input, icon-only model selector, and small send/stop control.
- Align the refine composer footer to the main editor footer height and remove the inner bordered container.
- Normalize AI draft and original note typography in compare mode and tighten line height in both panes.
- Restore safe-area bottom padding for the assistant composer footer in mobile sheet layouts.

## Files Changed
- `components/ai-actions/assistant-header.tsx`
- `components/ai-actions/sidebar-assistant.tsx`
- `components/ai-actions/assistant-refine-composer.tsx`
- `components/ai-actions/assistant-draft-card.tsx`
- `components/ai-chat/model-selector/index.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-23 | fix | Removed passive assistant context chrome, tightened the refine composer textarea, and removed the visible shortcut hint. |
| 2026-04-23 | fix | Tightened the assistant header, suppressed streaming status text, made the draft preview fill available height, and removed focus border changes from the refine composer. |
| 2026-04-23 | fix | Moved Replace, Insert, and Regenerate into the draft card header as compact draft-level controls with tooltips. |
| 2026-04-23 | fix | Replaced side-by-side compare with a vertical resizable split inside the draft card and collapsed the refine composer into one compact row. |
| 2026-04-23 | fix | Removed the bordered composer frame and aligned the refine composer to the main editor footer height. |
| 2026-04-23 | fix | Matched original-note compare typography to the AI draft and tightened shared line-height for a more compact preview. |
| 2026-04-23 | fix | Restored safe-area bottom padding for the assistant composer footer after PR review feedback. |

## Test Plan
- Manual: open `/files/welcome`, trigger an assistant draft, and verify the "Acting on ..." line is not rendered.
- Manual: verify the refine textarea is compact and the model selector/send row still remains usable.
- Manual: verify no visible kbd shortcut hint appears below the composer.
- Manual: start generation and verify the header does not show "Generating a new draft."
- Manual: verify the draft preview scroll body fills the card height.
- Manual: focus the refine input and verify no border styling changes.
- Manual: verify Replace, Insert, and Regenerate no longer render as a separate row beneath the draft card and remain usable from the draft header.
- Manual: enable compare mode and verify the original note appears below the AI draft in the same card with a draggable horizontal resize handle.
- Manual: verify the refine composer uses a single compact row with input, icon-only model selector, and send/stop button.
- Manual: verify the refine composer has no inner border frame and aligns visually with the main file footer height.
- Manual: enable compare mode and verify the AI draft and original note use matching compact typography.
- Manual: verify the assistant composer footer keeps safe bottom padding on devices with a non-zero bottom inset.
- `pnpm lint` and `pnpm build` pass.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- Browser annotations on `/files/welcome`.
