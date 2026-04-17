# Progress

Current issue: `docs/issues/issue-28.md`

Current section: Chore — AI SDK v6 Migration

Previous tasks (latest completed batch only):
- [x] Upgraded `ai` from v5.0.60 to v6.0.168.
- [x] Upgraded `@ai-sdk/react` from v2.0.60 to v3.0.170.
- [x] Ran official codemod `npx @ai-sdk/codemod v6` — auto-added `await` to `convertToModelMessages` in `app/api/ai/chat/route.ts`.
- [x] Verified all other AI SDK imports remain compatible (no manual fixes needed).
- [x] Verified lint and build pass.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `chore/1776423847-ai-sdk-v6-migration`
- Only one code change required: `convertToModelMessages` is now async in v6.
- `UIMessage`, `streamText`, `generateText`, `TextStreamChatTransport`, `Chat`, `useChat` all remain compatible.
