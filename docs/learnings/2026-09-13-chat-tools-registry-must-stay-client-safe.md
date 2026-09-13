# 2026-09-13-chat-tools-registry-must-stay-client-safe

- Area: `ai`
- Context: Story 29 added server-only vault mutation tools next to the chat tools popover registry.
- Symptom: `pnpm build` failed because `lib/ai/tools.ts` imported vault helpers, so client components pulled `next/cache` `use cache` modules into the browser bundle.
- Root cause: One module mixed the client-safe `CHAT_TOOLS` registry with `resolveServerTools()` implementations that import S3/cache/manifest code.
- Fix: Keep `lib/ai/tools.ts` as types + popover registry only. Put `resolveServerTools` in `lib/ai/resolve-server-tools.ts`, imported only from `/api/ai/chat`.
- Guardrails: Never import `lib/ai/vault-tools.ts` or FS mutation helpers from client components. New chat tools that touch S3/cache belong on the server resolver file.
- References: `docs/stories/story-29.md`, `docs/decisions/ADR-chat-vault-tools.md`
