# Progress

Current issue: `docs/issues/issue-19.md`

Current section: Issue 19 — SidebarChat Decomposition & Simplification

Previous tasks (latest completed batch only):
- [x] Extracted types.ts and utils.ts (FilePayload, SidebarChatHandle, computeExcerpt, computeDigest, messageToPlainText).
- [x] Created hooks/use-chat-session.ts (transport singleton, session rotation, useChat, auto-scroll).
- [x] Created hooks/use-models.ts (loading, localStorage caching, validation).
- [x] Created model-selector/ module (self-contained: index.tsx, model-list.tsx, model-filters.tsx, types.ts, utils.ts).
- [x] Extracted chat-message.tsx, chat-error-banner.tsx, chat-empty-state.tsx.
- [x] Created chat-composer.tsx with 10 props (down from 38), embedding ModelSelector.
- [x] Simplified auto-scroll from 3-effect pinned-to-top to scroll-to-bottom.
- [x] Rewrote sidebar-chat.tsx as ~170-line thin orchestrator.
- [x] Created index.tsx barrel export.
- [x] pnpm lint + pnpm build pass.
- [x] Fixed SonarCloud weak cryptography issue: Replaced Math.random() with crypto.getRandomValues() for session ID generation.

Next tasks:
- [ ] Commit and PR.

Notes:
- Branch: refactor/sidebar-chat-decomposition
- Follows file-tree/ pattern: index.tsx + sub-components + hooks/ + types.ts
- ModelSelector becomes self-contained (reads useChatStore directly, owns all internal state)
- ChatComposer drops from 38 props to ~8
- Auto-scroll simplified from 3-effect pinned-to-top to scroll-to-bottom
