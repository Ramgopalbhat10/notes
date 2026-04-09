# Progress

Current issue: `docs/issues/issue-24.md`

Current section: Issue 24 - Parallelize AI and S3 hot paths, and trim startup overhead

Previous tasks (latest completed batch only):
- [x] Added shared bounded-concurrency helpers and parallelized the AI, S3 folder, and tree-refresh hot paths.
- [x] Removed the duplicate startup settings fetch.
- [x] Ran `pnpm lint`.
- [x] Ran `pnpm build` with temporary placeholder GitHub auth env vars because the local shell lacked `GH_CLIENT_ID` and `GH_CLIENT_SECRET`.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `fix/performance-parallel-hot-paths`
- Scope is intentionally isolated from the resolved Issue 21 and Issue 23 work.
