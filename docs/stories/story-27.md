# Story 27 — Reasoning/Thinking Collapsible in AI Chat

Goal: Display LLM reasoning/thinking text in a collapsible section above the final response, instead of mixing it into the response text with no distinction.

## Scope
- In: Extract reasoning parts from UIMessage; render in a Radix Collapsible above the Response; auto-open while streaming, auto-collapse when done; explicit `sendReasoning` opt-in on the stream response.
- Out: Persistence of reasoning across sessions; reasoning editing; reasoning for non-assistant messages.

## Deliverables
- `components/ai-chat/utils.ts` — new `messageToReasoning` helper; `messageToPlainText` no longer includes reasoning parts.
- `components/ai-chat/chat-message.tsx` — new `ChatReasoning` collapsible component; wired into assistant message row.
- `app/api/ai/chat/route.ts` — explicit `sendReasoning: true` on `toUIMessageStreamResponse`.

## Acceptance Criteria
- Reasoning text appears in a collapsible above the final response, visually distinct.
- Collapsible auto-opens while streaming (label "Thinking…") and auto-collapses when streaming ends (label "Reasoning").
- User can manually toggle the collapsible open/closed.
- Copy and Insert actions contain only the final response text (no reasoning).
- Messages with no reasoning render normally (no empty collapsible).
- Messages with reasoning but no text content show only the collapsible (no "Waiting for response…" placeholder).

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-06-21 | feat | Split reasoning from plain text; added ChatReasoning collapsible; explicit sendReasoning opt-in |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 27.1 — Reasoning Collapsible
- Components
  - `components/ai-chat/utils.ts`
  - `components/ai-chat/chat-message.tsx`
  - `app/api/ai/chat/route.ts`
- Behavior
  - `messageToReasoning` extracts `type: "reasoning"` parts; `messageToPlainText` extracts only `type: "text"` parts.
  - `ChatReasoning` uses `@radix-ui/react-collapsible`; auto-opens while streaming, collapses on stream end.
  - Trigger row: chevron (rotates 90° when open) + `BrainCircuit` icon + label.
  - Content: scrollable box (`max-h-60 overflow-y-auto`), muted styling, `whitespace-pre-wrap`.
  - Rendered above `Response` in assistant `MessageContent` only when reasoning exists.
  - `sendReasoning: true` explicitly opts into reasoning streaming.

Sub-tasks
- [x] Add `messageToReasoning` helper; remove reasoning from `messageToPlainText`
- [x] Add `ChatReasoning` collapsible component
- [x] Wire `ChatReasoning` into assistant message row above `Response`
- [x] Add `sendReasoning: true` to `toUIMessageStreamResponse`
- [x] Run `pnpm lint` and `pnpm build`

Test Plan
- Send a chat message to a reasoning-capable model; confirm collapsible opens during streaming with "Thinking…" label.
- When streaming ends, confirm collapsible auto-closes and label changes to "Reasoning".
- Click trigger to toggle open/closed.
- Use Copy and Insert actions; confirm only final response text is included (no reasoning).
- Send a message to a non-reasoning model; confirm no collapsible appears and response renders normally.

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.

## References
- Story 5 — AI Chat (Right Sidebar)
