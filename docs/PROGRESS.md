# Progress

Current issue: `docs/issues/issue-18.md`

Current section: Issue 18 — AI Route & Component Code Health Cleanup

Previous tasks (latest completed batch only):
- [x] Removed stale comment in sidebar-chat.tsx.
- [x] Extracted shared `clampText` to `lib/ai/text-utils.ts`; updated both AI routes.
- [x] Decomposed `move/route.ts` POST handler into `moveFolderInS3` + `moveFileInS3` helpers.
- [x] Extracted `ChatErrorBanner`, `ModelSelectorPopover`, `ChatComposer` from `SidebarChat`.
- [x] pnpm lint + pnpm build pass.

Next tasks:
- [ ] Commit and PR.

Bug fix details (stale cache):
- Root cause: `revalidateTag(tag, "max")` in Next.js 16 uses stale-while-revalidate, serving stale cached data on first request after invalidation.
- Mutations no longer reload manifest (optimistic state preserved, manifestEtag cleared for next natural load).
- Manual refresh returns full manifest in response, bypassing stale "use cache" layer.
- Fixed `fetchManifest` to respect force parameter (skip If-None-Match header when force=true).

Sonar/review fixes:
- localeCompare for reliable alphabetical sorting in state-mutators.ts and state-from-manifest.ts.
- Keyboard listener (Enter/Space) + role="button" on interactive div in header.tsx.
- Promise misuse: converted async handleCopyPublicLink to sync void-returning function.
- ReDoS-safe patterns: bounded quantifiers and string methods in markdown-outline.ts, markdown-image-policy.ts, store-selection.ts.
- Move API field mismatch: client now sends fromKey/toKey matching server contract.
- Additional ReDoS fix: replaced ATX_HEADING_RE regex with deterministic string parser to eliminate Sonar S5852 hotspot.

Notes:
- Follows consistent pattern established in `components/file-tree/hooks/`.
- Domain grouping for lib/: fs, cache, content, platform.
- Issue 16 (massive refactor phases 1-4) complete and merged.
