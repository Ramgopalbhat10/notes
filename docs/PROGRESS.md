# Progress

Current story: `docs/stories/story-26.md`

Current section: Story 26 — Web Search Tools in AI Chat

Previous tasks (latest completed batch only):
- [x] Create `lib/ai/tools.ts` with ChatToolDefinition, SearchProvider types, CHAT_TOOLS registry, resolveServerTools()
- [x] Update `app/api/ai/chat/route.ts` to accept tools and inject into streamText
- [x] Add tools state to `stores/chat.ts`
- [x] Update `use-chat-session.ts` to include tools in request context
- [x] Create `tools-selector/types.ts` with UI prop types
- [x] Create `tools-selector/tool-item.tsx` — tool row + HoverCard sub-popover with provider switches
- [x] Create `tools-selector/index.tsx` — main popover with trigger button and tool list
- [x] Wire ToolsSelector into `chat-composer.tsx`
- [x] Ran `pnpm lint` and `pnpm build` — both passed

Next tasks:
- [ ] Manual smoke test: chat without tools, chat with Parallel enabled, toggle on/off during session

Notes:
- Branch: `feature/web-search-tools`
- Integrating Parallel web search via Vercel AI Gateway (`gateway.tools.parallelSearch()`)
- Extensible architecture: new providers can be added to CHAT_TOOLS registry
- Tool calling happens server-side via streamText; client transport unchanged (TextStreamChatTransport)
