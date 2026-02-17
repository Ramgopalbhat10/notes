# Issue 1 — Unnecessary Console Logging in File Tree Builder

<!--
Notes:
- Copy this file to `docs/issues/issue-<N>.md`.
- Update `docs/issues/README.md` to add the new issue row.
- Use this for bug fixes, refactors, performance fixes, code cleanup, and other non-feature work.
- If this issue relates to a story, add cross-references in both files.
- Source template: `docs/issues/template.md`.
-->

## Type
<!-- One of: bug | refactor | performance | cleanup | chore -->
- cleanup

## Status
<!-- One of: open | in-progress | resolved -->
- resolved

## Related Story
<!-- If this issue stems from or relates to a story, link it here. Update the story's Issues section too. -->
- None

## Description
- The `buildContext` function in `lib/file-tree-builder.ts` contains verbose `console.log` statements that clutter the build output and are unnecessary for production.

## Root Cause
<!-- For bugs: what caused it. For refactors/perf: why the change is needed. -->
- Debug logs were left in the codebase.

## Fix / Approach
- Remove `console.log` statements in `lib/file-tree-builder.ts`.

## Files Changed
- `lib/file-tree-builder.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-17 | fix | Removed `console.log` statements from `lib/file-tree-builder.ts` to declutter build output. |
