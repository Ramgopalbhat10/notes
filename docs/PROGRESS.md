# Progress

Current issue: `docs/issues/issue-25.md`

Current section: Issue 25 - Parallelize cache invalidation and manifest updates

Previous tasks (latest completed batch only):
- [x] Parallelized revalidateFileTags in lib/fs/file-cache.ts with concurrency of 10.
- [x] Parallelized deleteFileMetas in lib/fs/file-meta.ts with concurrency of 10.
- [x] Added concurrency to moveFolder in lib/manifest-updater.ts with threshold of 50 and concurrency of 6.
- [x] Fixed syntax errors in modified files.
- [x] Ran `pnpm lint` and `pnpm build` - both passed.
- [x] Created issue-25.md and updated issues README.

Next tasks:
- Commit changes with prefix `perf:`
- Create PR from current branch to main

Notes:
- Branch: `fix/performance-parallel-hot-paths`
- This is a new performance issue separate from resolved Issue 24.
