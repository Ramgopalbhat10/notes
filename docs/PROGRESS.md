# Progress

Current story: `docs/stories/story-25.md`

Current section: Story 25 — Configurable Default Chat Model + Assistant Sidebar Redesign

Previous tasks (latest completed batch only):
- [x] Extended `UserSettings` with `ai.defaultModel` across client types, settings store, and `/api/settings` route (with `parseModelId` validation).
- [x] Added `modelUserOverridden` to `useChatStore`; `setSelectedModel` now accepts a source meta; `clearChat` preserves the override.
- [x] Made `ModelSelector` support controlled `value` / `onChange`; added `useDefaultModelSync` and mounted it in `SidebarChat`.
- [x] Added the "Chat" section to the Settings modal with a default-model picker portalled inside the dialog.
- [x] Redesigned the Assistant sidebar into `AssistantHeader` / `AssistantDraftCard` / `AssistantRefineComposer` / `AssistantEmptyState`, with a segmented Preview|Raw toggle, streaming skeleton, and sticky footer CTAs.
- [x] Ran `pnpm lint` and `pnpm build` — both pass.

Next tasks:
- [ ] Commit the feature branch and open a PR.

Notes:
- Branch: `feature/default-model-settings-assistant-redesign`
- User decisions applied: sidebar pick survives New Chat (reload-only reset), segmented Preview|Raw, model selector stays only inside the refine composer, empty state gets clickable quick-action chips.
