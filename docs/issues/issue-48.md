# Issue 48 — Incomplete chat tool calls block follow-up messages

## Type
- bug

## Status
- resolved

## Related Story
- Story 29 — Chat Vault Tools (`docs/stories/story-29.md`)
- Story 26 — Web Search Tools in AI Chat (`docs/stories/story-26.md`)

## Description
- After Parallel `web_extract` on a JS-heavy Humble Bundle URL, the activity row stayed on "Reading…" and a follow-up message failed with `Tool result is missing for tool call …`.
- Extract defaulted to excerpts without `full_content` and had no live-fetch timeout, so a slow/empty JS page could outlive the 60s chat `maxDuration` and leave the tool part in `input-available`.

## Root Cause
- `convertToModelMessages` requires every tool call to have a result. Stream abort/timeout leaves `input-streaming` / `input-available` parts in history.
- `isStreaming` is false after the stream dies, so the composer accepts a new send.
- Default `extractTool` does not request full JS-rendered markdown and does not cap Parallel's live fetch.

## Fix / Approach
- Complete interrupted tool parts as `output-error` when the stream ends, before send/regenerate, and on the outgoing chat request body.
- Server: complete incomplete parts and pass `ignoreIncompleteToolCalls: true`; abort `streamText` when the client disconnects.
- Use `createExtractTool` with `full_content` and `fetch_policy.timeout_seconds: 25`, plus a 35s execute deadline so Parallel cannot outlive the chat stream.
- Prompt: extract can render many JS pages; empty/login-walled results must be reported, not invented.

## Files Changed
- `lib/ai/complete-incomplete-tools.ts`
- `components/ai-chat/hooks/use-chat-session.ts`
- `app/api/ai/chat/route.ts`
- `lib/ai/resolve-server-tools.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-09-13 | fix | Completed interrupted tool parts so follow-up messages can send; bounded Parallel extract and requested full JS-rendered content. |
| 2026-09-13 | fix | Added a 35s extract execute deadline, default extract objective, and client-disconnect abort so hung JS pages cannot block the next send. |

## Test Plan
- Send a follow-up after a hung/failed extract: no "Tool result is missing" banner; activity row shows failed instead of spinning.
- URL extract uses an objective and can return markdown for public JS pages; login walls still reported as empty.

## Definition of Done
- Fix verified (lint + typecheck).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- Related story Issues tables updated.

## References
- https://github.com/Ramgopalbhat10/notes/pull/123
- https://docs.parallel.ai/extract/extract-quickstart
