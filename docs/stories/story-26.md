# Story 26 — Web Search Tools in AI Chat

Goal: Add web search capability to the chat sidebar with an extensible provider architecture, starting with Parallel Search via Vercel AI Gateway.

## Scope
- In: Tool provider registry, Parallel web search integration, tools popover UI with provider toggles, extensible provider architecture
- Out: Other web search providers (Perplexity, Anthropic, OpenAI, Google), search result citation UI, tool call visualization in chat messages

## Deliverables
- `lib/ai/tools.ts` — tool provider registry + server-side resolver
- `stores/chat.ts` — tools state (enabledTools, toggleToolProvider)
- `app/api/ai/chat/route.ts` — accept tools, inject into streamText
- `components/ai-chat/hooks/use-chat-session.ts` — include tools in request context
- `components/ai-chat/tools-selector/index.tsx` — main popover
- `components/ai-chat/tools-selector/tool-item.tsx` — tool row with hover provider sub-popover
- `components/ai-chat/tools-selector/types.ts` — UI types
- `components/ai-chat/chat-composer.tsx` — wire ToolsSelector button
- `components/ai-chat/sidebar-chat.tsx` — pass tool props to composer

## Acceptance Criteria
- Tools icon button appears in chat composer footer
- Clicking tools icon opens popover with "Web Search" tool item
- Web Search row has a ChevronRight that on hover opens provider list with Parallel toggle
- Toggling Parallel on sends `gateway.tools.parallelSearch()` config to `/api/ai/chat`
- When tools are enabled, `streamText` includes the tool config and tool calling happens server-side
- When no tools are enabled, existing chat behavior is unchanged
- Architecture supports adding new providers without modifying UI components

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-05-17 | feat | Initial story setup |
| 2026-05-17 | feat | Created lib/ai/tools.ts — ChatToolDefinition, SearchProvider types, CHAT_TOOLS registry, resolveServerTools() |
| 2026-05-17 | feat | Added enabledTools and toggleToolProvider to stores/chat.ts |
| 2026-05-17 | feat | Updated /api/ai/chat route to accept tools, inject into streamText with toolChoice:auto |
| 2026-05-17 | feat | Updated use-chat-session to include tools in request context ref |
| 2026-05-17 | feat | Created tools-selector UI (index, tool-item with HoverCard provider sub-popover, types) |
| 2026-05-17 | feat | Wired ToolsSelector into chat-composer.tsx and sidebar-chat.tsx |
| 2026-05-17 | quality | Ran pnpm lint and pnpm build — both passed |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 26.1 — Tool Registry + Server Integration
- Components
  - `lib/ai/tools.ts`
  - `app/api/ai/chat/route.ts`
- Behavior
  - Define extensible tool/provider types and registry
  - Server-side resolver maps enabled providers to gateway tools
  - Accept tools in request body, conditionally inject into streamText
  - Tool calling handled server-side via toTextStreamResponse

Sub-tasks
- [x] Create `lib/ai/tools.ts` with ChatToolDefinition, SearchProvider types, CHAT_TOOLS registry, resolveServerTools()
- [x] Update `app/api/ai/chat/route.ts` to accept tools and inject into streamText
- [x] Add tools state to `stores/chat.ts`
- [x] Update `use-chat-session.ts` to include tools in request context

Test Plan
- Send a chat message without tools enabled: verify response streams normally
- Send a chat message with Parallel enabled: verify the model can call web search (check for tool calls in response)

---

## Story 26.2 — Tools Selector UI
- Components
  - `components/ai-chat/tools-selector/index.tsx`
  - `components/ai-chat/tools-selector/tool-item.tsx`
  - `components/ai-chat/tools-selector/types.ts`
- Behavior
  - Tools icon button in composer footer
  - Popover with tool list
  - Web Search row with hover-triggered provider sub-popover
  - Switch toggles for each provider

Sub-tasks
- [x] Create `tools-selector/types.ts` with UI prop types
- [x] Create `tools-selector/tool-item.tsx` — tool row + HoverCard sub-popover with provider switches
- [x] Create `tools-selector/index.tsx` — main popover with trigger button and tool list
- [x] Wire ToolsSelector into `chat-composer.tsx`

Test Plan
- Open chat sidebar, verify tools icon appears in footer
- Click tools icon, verify popover shows "Web Search"
- Hover ChevronRight, verify provider popover shows Parallel with toggle
- Toggle Parallel on, send a message, verify tool is active
- Toggle Parallel off, verify tool is disabled

---

## Story 26.3 — Verification and Regression Checks
- Components
  - All changed files
- Behavior
  - Validate functional scenarios and ensure no regressions.

Sub-tasks
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.
- [ ] Manual smoke test: chat without tools, chat with Parallel enabled, toggle on/off during session

Test Plan
- Chat without tools: messages stream normally
- Chat with Parallel enabled: model can search web
- Toggle Parallel off mid-session: subsequent messages use no tools
- No visual regressions in chat sidebar

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.

## References
- https://docs.parallel.ai/integrations/vercel#vercel-ai-gateway
- https://vercel.com/docs/ai-gateway/capabilities/web-search
