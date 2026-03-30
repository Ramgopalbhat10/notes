---
date: 2026-03-30
topic: ai-actions-ux
---

# AI Actions UX Redesign

## What We're Building
Redesign the current AI actions from a hidden, header-only affordance with a disruptive top-of-page result card into a hybrid editing experience. Users should be able to trigger AI actions from text selection in edit mode for the common case, while still keeping document-level actions available from the header for whole-note work.

The richer review and apply flow should move into the existing right sidebar. That workspace should support iterative AI-assisted editing instead of a one-shot result: compare with the original, regenerate, refine with follow-up instructions, and apply output with clearer replace/insert choices.

## Why This Approach
The current card interrupts reading and editing because it inserts itself above the page content and feels detached from the selection that triggered it. Comparable tools such as Notion, Coda, Grammarly, and Word keep the trigger near the user’s editing context while moving heavier AI interaction into a side surface or margin workspace.

The hybrid approach is the best fit here because it solves the disruption problem without turning the existing chat sidebar into an all-purpose AI IDE. It also lets the product reuse the existing right-sidebar shell and model-selection infrastructure.

## Key Decisions
- Primary UX: hybrid selection-first entry with a richer right-sidebar assistant workspace.
- Dominant use case: selected text edits, with whole-note actions still supported from the header.
- V1 scope: UX redesign plus practical removal of avoidable context/output limits.
- Assistant placement: right sidebar on desktop with mobile sheet fallback.
- Starter action set stays the same: Improve Writing, Summarize, Expand.

## Open Questions
- Should preview mode also get a selection-triggered AI entry, or should v1 keep that to edit mode only?
- How far should v1 go on large-document processing for improve/expand versus summary-specific chunking?
- Should the assistant panel remain a distinct surface from chat long term, or eventually converge with it?

## Next Steps
→ `/workflows:plan` for implementation details
