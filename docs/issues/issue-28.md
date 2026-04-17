# Issue 28 — AI SDK v6 Migration

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- Upgrade `ai` from v5 to v6 and `@ai-sdk/react` from v2 to v3 to stay current with the Vercel AI SDK.

## Root Cause
- AI SDK v5 is now superseded by v6 with breaking API changes (async `convertToModelMessages`, removed `CoreMessage` type, deprecated `generateObject`/`streamObject`).

## Fix / Approach
- Installed `ai@6.0.168` and `@ai-sdk/react@3.0.170`.
- Ran official codemod `npx @ai-sdk/codemod v6` which automatically added `await` to `convertToModelMessages` call in `app/api/ai/chat/route.ts`.
- Verified all other AI SDK imports (`UIMessage`, `streamText`, `generateText`, `TextStreamChatTransport`, `Chat`, `useChat`) remain compatible — no manual fixes needed.

## Files Changed
- `package.json`
- `pnpm-lock.yaml`
- `app/api/ai/chat/route.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-17 | chore | Upgraded AI SDK v5→v6, ran codemod, verified lint and build pass |

## Test Plan
- `pnpm lint` passes.
- `pnpm build` passes.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- [AI SDK v6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-v6)
- Codemod: `npx @ai-sdk/codemod v6`
