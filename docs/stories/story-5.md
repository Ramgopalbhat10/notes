# Story 5 — AI Chat (Right Sidebar)

Goal: Build a ChatGPT‑like right sidebar powered by Vercel AI SDK with the current file as context.

## Scope
- In: `/api/ai/chat` endpoint; client chat UI with streaming, compose box, message list; insert into editor.
- Out: Conversation persistence across sessions, multi‑file RAG, vector store (future).

## Deliverables
- Server: chat route using Vercel AI SDK streaming with context (file title/path and content excerpt).
- Client: chat UI (AI Elements or `useChat`) in the right sidebar with insert/copy buttons per message.

## Acceptance Criteria
- Messages stream token‑by‑token; UI remains responsive.
- Current file context is injected (truncated if necessary) and improves answers.
- User can insert an assistant message into the editor at cursor or append.

---

## Story 5.1 — API: `/api/ai/chat`
- Request body
  - `{ messages: ChatMessage[], file: { key: string, contentDigest?: string, excerpt?: string }, model?: string }`
- Behavior
  - Load file content on the server by key (or trust provided excerpt/digest), truncate to token budget.
  - Compose a system prompt stating role and context policy; stream response.

Sub‑tasks
- [ ] Implement route with Vercel AI SDK streaming helpers.
- [ ] Token/size guard for context; basic redaction (no secrets) and sanitization.
- [ ] Return SSE/streaming response compatible with client hook.

Test Plan
- Long documents are truncated with a note; responses stream.
- Error cases return JSON with message; client displays error.

---

## Story 5.2 — Client: Chat UI in Right Sidebar
- UI
  - Message list with role badges; composer with send/stop; regenerate last.
  - Per‑message actions: Copy, Insert into editor.

Sub‑tasks
- [ ] Install and set up Vercel AI SDK UI (AI Elements) or `useChat` from `ai/react`.
- [ ] Implement chat container within the existing right sidebar area.
- [ ] Wire insert action to editor (append or replace selection if in Edit mode).
- [ ] Show tokenizing/loading indicators; allow cancel.

Test Plan
- Sending prompts streams; inserting content modifies the editor as expected.
- Cancel works; regenerate repeats last prompt with same context.

---

## Definition of Done
- Chat streams with current file context and supports insert/copy actions.
- Errors and long‑context limits handled gracefully.
