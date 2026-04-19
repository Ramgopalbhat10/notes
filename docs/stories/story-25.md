# Story 25 — Configurable Default Chat Model + Assistant Sidebar Redesign

Goal: Let users persist their preferred default chat model in Settings, and redesign the AI Assistant sidebar to feel premium, on par with the chat composer and Editor surfaces.

## Scope
- In:
  - New `ai.defaultModel` field in user settings (client + server + Redis persistence).
  - New "Chat" section in the Settings modal with a default-model picker.
  - Sync layer that seeds `useChatStore.selectedModel` from the persisted default on load, without overwriting user picks during a session.
  - Full UI/UX redesign of the AI Assistant sidebar (header, draft card, refine composer, empty state, streaming state).
- Out:
  - Any gateway-side or server-side model policy changes.
  - New AI actions or new provider integrations.
  - Persisting selection per-chat (explicitly out).

## Deliverables
- Settings
  - `components/settings/types.ts` — extended `UserSettings` + `defaultUserSettings` + `SettingsSection` with `"chat"`.
  - `stores/settings.ts` — normalize + merge `ai` section.
  - `app/api/settings/route.ts` — GET/PUT merge for `ai.defaultModel`, validated through `parseModelId`.
  - `components/settings/settings-modal.tsx` — new "Chat" nav entry, new `ChatSettings` subcomponent, new `updateDraftAi` helper, popover portalled inside the dialog.
- Model selection
  - `components/ai-chat/model-selector/index.tsx` — new controlled `value` / `onChange` props; uncontrolled fallback preserves the existing `useChatStore` wiring.
  - `stores/chat.ts` — new `modelUserOverridden` flag; `setSelectedModel` accepts a source meta; `clearChat` does NOT reset the override (only a full reload does).
  - `components/ai-chat/hooks/use-default-model-sync.ts` — new hook that mounts in `SidebarChat`; seeds the session model from settings on first load when the user has not overridden.
- Assistant sidebar redesign
  - `components/ai-actions/sidebar-assistant.tsx` — reduced to an orchestrator.
  - `components/ai-actions/assistant-header.tsx` — segmented action control, action cluster (compare/copy/clear), status line.
  - `components/ai-actions/assistant-draft-card.tsx` — sticky header with Preview|Raw segmented toggle, streaming skeleton, sticky footer CTAs.
  - `components/ai-actions/assistant-refine-composer.tsx` — chat-composer-parity refine composer with model selector visible.
  - `components/ai-actions/assistant-empty-state.tsx` — Sparkles glyph + quick-action chips that trigger Improve / Summarize / Expand.
- Docs
  - `docs/stories/README.md` — new row for Story 25.
  - `docs/PROGRESS.md` — reset to Story 25 with current sub-tasks.

## Acceptance Criteria
- Settings modal has a new "Chat" section with a default-model selector. Saving persists to Redis via `/api/settings`.
- On a fresh page load, the chat sidebar model pill reflects the saved default when the user has not manually overridden it in the session.
- Changing the model from the chat sidebar during a session does NOT change the settings value, and the override survives `New Chat` within the session (only a full reload resets it).
- Invalid or unknown model ids are never persisted server-side.
- The Assistant sidebar header uses a segmented control for actions; Preview|Raw is a segmented toggle; Regenerate / Replace / Insert are laid out as a single primary CTA bar with consistent sizing; empty state exposes quick-action chips; compare and refine behaviors are unchanged.
- `pnpm lint` and `pnpm build` pass.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-19 | docs | Scaffolded Story 25, branched `feature/default-model-settings-assistant-redesign`, reset `docs/PROGRESS.md`. |
| 2026-04-19 | 25.1 | Extended `UserSettings` with `ai.defaultModel` in client types, `stores/settings.ts` normalize, and `/api/settings` GET/PUT merges with `parseModelId` validation. |
| 2026-04-19 | 25.2 | Added `modelUserOverridden` + source meta to `stores/chat.ts` (preserved across `clearChat`); made `ModelSelector` controlled-capable; added `useDefaultModelSync` hook and mounted it in `SidebarChat`; reconciled the `useModels` fallback to use `source: "system"`. |
| 2026-04-19 | 25.3 | Added the "Chat" nav section + `ChatSettings` subcomponent to `settings-modal.tsx`; portalled the model popover into the dialog content. |
| 2026-04-19 | 25.4 | Redesigned the Assistant sidebar into four subcomponents: `AssistantHeader` (segmented action control + cluster + status), `AssistantDraftCard` (matched compare panels, segmented Preview|Raw, streaming skeleton, sticky CTA bar), `AssistantRefineComposer` (chat-composer-parity, visible model selector), `AssistantEmptyState` (Sparkles + quick-action chips). |
| 2026-04-19 | 25.5 | Ran `pnpm lint` and `pnpm build` — both pass. |

## Issues
<!-- Cross-references to related issues (bugs, refactors, perf fixes) filed against this story.
     Add a row when an issue is created that relates to this story. Keep Status in sync. -->

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 25.1 — Persist `ai.defaultModel` in Settings

- Components
  - `components/settings/types.ts`
  - `stores/settings.ts`
  - `app/api/settings/route.ts`
- Behavior
  - Introduce `ai: { defaultModel: string }` with default `DEFAULT_CHAT_MODEL`.
  - Normalize merges and validate model ids through `parseModelId` on write.

Sub-tasks
- [ ] Extend `UserSettings` + `defaultUserSettings` + `SettingsSection`.
- [ ] Extend `normalizeSettings` in `stores/settings.ts`.
- [ ] Extend GET/PUT merges and validation in `app/api/settings/route.ts`.

Test Plan
- Open Settings → Chat → pick another model → save. Reload. Verify saved value returns and the chat sidebar adopts it.
- Invalid `defaultModel` in the PUT body is dropped, not persisted.

---

## Story 25.2 — Controlled ModelSelector + `useDefaultModelSync`

- Components
  - `components/ai-chat/model-selector/index.tsx`
  - `stores/chat.ts`
  - `components/ai-chat/hooks/use-default-model-sync.ts`
  - `components/ai-chat/sidebar-chat.tsx`
- Behavior
  - `ModelSelector` accepts optional `value` / `onChange` for controlled use (Settings).
  - Uncontrolled path continues to read/write `useChatStore` and flips `modelUserOverridden = true` on user pick.
  - `useDefaultModelSync` seeds `selectedModel` from settings on first load when not overridden.

Sub-tasks
- [ ] Add `modelUserOverridden` to `useChatStore`.
- [ ] Controlled props on `ModelSelector`.
- [ ] Add and mount `useDefaultModelSync` in `SidebarChat`.

Test Plan
- Pick a non-default model in the chat sidebar → Settings value unchanged.
- Click "New Chat" → sidebar keeps overridden model.
- Full reload → sidebar reverts to settings default.

---

## Story 25.3 — Settings modal "Chat" section

- Components
  - `components/settings/settings-modal.tsx`
- Behavior
  - New nav entry, new `ChatSettings` subcomponent, popover portalled inside dialog.

Sub-tasks
- [ ] Add `"chat"` to `settingsSections`.
- [ ] Implement `ChatSettings` using controlled `ModelSelector`.
- [ ] Wire `updateDraftAi` through `SettingsContent`.

Test Plan
- Pick a model in Settings → Save → toast → reload → value sticky.
- Discard changes on close works for the new section too.

---

## Story 25.4 — Assistant sidebar redesign

- Components
  - `components/ai-actions/sidebar-assistant.tsx`
  - `components/ai-actions/assistant-header.tsx`
  - `components/ai-actions/assistant-draft-card.tsx`
  - `components/ai-actions/assistant-refine-composer.tsx`
  - `components/ai-actions/assistant-empty-state.tsx`
- Behavior
  - Segmented action control; single status line; segmented Preview|Raw; sticky footer CTAs; premium empty state with quick-action chips; streaming skeleton.

Sub-tasks
- [ ] Split sidebar into the four subcomponents.
- [ ] Implement premium empty state with quick-action chips.
- [ ] Implement segmented Preview|Raw toggle and streaming skeleton.
- [ ] Normalize button sizes / icon dimensions to match chat composer.

Test Plan
- Run Improve / Summarize / Expand from both header and empty state.
- Stream, cancel, regenerate, refine, compare (≥lg), copy, clear.
- Verify keyboard focus order remains sensible.

---

## Story 25.5 — Verification and Regression Checks

- Components
  - whole app
- Behavior
  - Validate functional scenarios and ensure no regressions.

Sub-tasks
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.

Test Plan
- Chat: compose, send, regenerate, clear, switch model.
- Assistant: all three actions in both document + selection modes; refine; cancel.
- Settings: change default model, save, reset to defaults, reload.

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.

## References
- `lib/ai/models.ts`
- `components/ai-chat/model-selector/`
- `components/ai-actions/sidebar-assistant.tsx`
- `docs/stories/story-14.md` — AI Gateway Migration + Dynamic Model Selection (original source of `DEFAULT_CHAT_MODEL`).
