## Summary
<!-- What changed, why, and how. Replace this comment with your actual description. -->
<!-- Example: 
## 🎯 What
Refactored the monolithic handleModalSubmit function in FileTree into a focused custom hook useModalSubmit.

## 💡 Why
- handleModalSubmit was 92 lines handling 5 distinct action types in one switch block
- Made the component harder to read and the logic harder to isolate
- Follows existing hook pattern (use-tree-keyboard-navigation.ts) for consistency

## ✅ Verification
- pnpm lint — passes with 0 errors
- pnpm build — passes with 0 errors
- No behavior changes — all validation, toast messages, and navigation-after-delete logic preserved exactly

## ✨ Result
- FileTree component reduced by ~70 lines
- Modal action logic now isolated in hooks/use-modal-submit.ts
- Easier to test and maintain in isolation
-->

## Type
- [ ] Feature (story)
- [ ] Bug fix (issue)
- [ ] Refactor (issue)
- [ ] Performance (issue)
- [ ] Docs / chore

## Mandatory Checklist (MUST complete — reviewer will reject if unchecked)

### Documentation
- [ ] Story or issue file exists and is complete (`docs/stories/story-<N>.md` or `docs/issues/issue-<N>.md`)
- [ ] Story/issue index updated (`docs/stories/README.md` or `docs/issues/README.md`)
- [ ] `docs/PROGRESS.md` reflects the final state of this work
- [ ] Dev Log in the story/issue file has at least one entry for this work
- [ ] Cross-references added (if issue relates to a story)

### Branch & Code Quality
- [ ] Branch follows naming convention (`feature/`, `fix/`, `refactor/`, `chore/`, `docs/`)
- [ ] NOT committing directly to `main`
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] `git diff main --stat` reviewed — only expected files changed
- [ ] Commits follow Conventional Commits format (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)

### Testing Policy
- [ ] No test files included (`*.test.*`, `*.spec.*`, `__tests__/`)
- [ ] If test files were generated during development, they have been deleted

### Architecture (if applicable)
- [ ] Decision record added/updated in `docs/decisions/` (for auth/caching/data-flow/architecture changes)
- [ ] Learning added to `docs/learnings/` (if non-obvious lesson emerged)

## Related
- Story/Issue: <!-- e.g., docs/issues/issue-5.md -->
- Closes: <!-- e.g., #63 -->
