# Issue 15 — Refactor Workflow to Label-Based Control System

<!--
Notes:
- Copy this file to `docs/issues/issue-<N>.md`.
- Remove all notes and comments before using.
- Update `docs/issues/README.md` to add the new issue row.
- Use for bug fixes, refactors, performance fixes, code cleanup, and other non-feature work.
- If this issue relates to a story, add cross-references in both files.
- Source template: `docs/issues/template.md`.
-->

## Type
<!-- One of: bug | refactor | performance | cleanup | chore -->
- refactor

## Status
<!-- One of: open | in-progress | resolved -->
- in-progress

## Related Story
<!-- If this issue stems from or relates to a story, link it here. Update the story's Issues section too. -->
- None

## Description
- The workflow system was too rigid with mandatory gates that forced sequential execution, making it inflexible for quick iterations or targeted operations.

## Root Cause
<!-- For bugs: what caused it. For refactors/perf: why the change is needed. -->
- The original workflow enforced hard stops at pre-code and post-code gates, preventing selective execution of workflow phases.
- Documentation was verbose and loaded too much context into every chat session, increasing token usage unnecessarily.

## Fix / Approach
- Implemented a label-based workflow control system with 6 labels: `[ask]`, `[code-only]`, `[docs-only]`, `[quality]`, `[commit]`, `[push]`.
- Compressed documentation from verbose files to minimal references (AGENTS.md: 56 lines, WORKFLOW_LABELS.md: 33 lines).
- Added explicit label detection as the first step in Session Bootstrap.
- Implemented gap-filling logic for `[commit]` and `[push]` labels.
- Added `[ask]` label for pure conversational queries that bypass all workflow file loading.

## Files Changed
- `AGENTS.md` — Refactored to label-based system with explicit detection rules
- `docs/WORKFLOW.md` — Removed label annotations, restored clean phase structure
- `docs/WORKFLOW_LABELS.md` — Created compact phase map and gap-fill reference

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2025-02-27 | refactor | Implemented label-based workflow control system with gap-filling and minimal documentation |

## Test Plan
- Test all 6 labels execute correct phases
- Verify gap-filling works for `[commit]` and `[push]`
- Confirm `[ask]` bypasses all file loading
- Validate progressive disclosure reduces context loading

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- Issue added to `docs/issues/README.md` index.

## References
- `docs/WORKFLOW_LABELS.md` — Complete label reference
- `docs/WORKFLOW.md` — Phase execution rules
