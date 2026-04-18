# Progress

Current issue: `docs/issues/issue-32.md`

Current section: Issue 32 — Redesign Chat Sidebar Model Selector

Previous tasks (latest completed batch only):
- [x] Added `getProviderInitials` + `getProviderAccentClass` to `components/ai-chat/model-selector/utils.ts` and introduced the new `ProviderAvatar` component.
- [x] Redesigned `ModelFilters` to use circular provider avatar chips and tighter feature chips.
- [x] Redesigned `ModelList` rows (avatar + name + capability icons + selected accent stripe) and made provider group headers sticky.
- [x] Redesigned `ModelSelector` trigger and popover header (flush command-palette feel) while preserving all existing state/behavior.
- [x] Ran `pnpm lint` and `pnpm build` (both pass).

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `refactor/model-selector-redesign`
- Constraints preserved: narrow sidebar (~24rem), search with clear button, filter reset on close, focus-on-open for desktop, mobile sheet portal, wheel-to-horizontal scroll on filter rows, provider/feature filter resets when options change.
- No hover card / details panel — explicitly dropped per issue requester.
- Provider avatars use a deterministic tint derived from existing theme tokens so each provider has a stable identity across light and dark mode.
