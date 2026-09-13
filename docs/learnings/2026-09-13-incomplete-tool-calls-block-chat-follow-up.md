# 2026-09-13-incomplete-tool-calls-block-chat-follow-up

- Area: `ai`
- Context: Parallel `web_extract` on a JS-heavy URL outlived the chat stream. The UI kept a "Reading…" row and the next user message failed.
- Symptom: `Tool result is missing for tool call <id>`. Composer was enabled because `status` was no longer streaming.
- Root cause: `convertToModelMessages` requires a result for every tool call. Abort/timeout leaves parts in `input-available`. Default extract had no live-fetch timeout and `full_content: false`.
- Fix: Mark interrupted tool parts as `output-error` on the client; sanitize + `ignoreIncompleteToolCalls` on the server. `createExtractTool` requests full content and times out live fetches at 20s.
- Guardrails: Never send chat history that still has `input-streaming` / `input-available` tool parts. Parallel extract can render many public JS pages, but login walls and some SPAs still return empty — do not invent the missing content.
- References: `docs/issues/issue-48.md`, `lib/ai/complete-incomplete-tools.ts`, `lib/ai/resolve-server-tools.ts`
