# 2026-02-13-header-nav-enabled-state-wrong

- Area: `header`
- Context: Added prev/next navigation within a folder.
- Symptom: Nav buttons enabled when folder children included folders.
- Root cause: Sibling list included non-file nodes.
- Fix: Filter siblings to file nodes only (e.g., `nodes[childId]?.type === "file"`).
- Guardrails: Manually verify mixed folder/file parents; add a test if/when a harness exists.
- References: `docs/stories/story-16.md`

