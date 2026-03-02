# Progress

Current issue: `docs/issues/issue-16.md`

Current section: Issue 16 — Massive Refactor Roadmap Execution (Stability-First)

Previous tasks (latest completed batch only):
- [x] Started Phase 3 by extracting responsive left-sidebar layout calculations into `components/app-shell/use-left-sidebar-layout.ts`.
- [x] Continued Phase 3 by extracting global keyboard shortcuts into `components/app-shell/use-app-shell-shortcuts.ts`.
- [x] Ran quality gate checks (`pnpm lint`, `pnpm build`) successfully after these extractions.

Next tasks:
- [ ] Continue Phase 3 by extracting right sidebar mobile sheet state/handlers from `components/app-shell.tsx`.

Notes:
- Phase 1 shared client I/O/error extraction completed with no behavioral intent changes.
- Phase 2 decomposition now includes `use-file-sharing`, `use-resolved-path`, `use-sibling-navigation`, `use-workspace-settings-sync`, `use-workspace-file-sync`, `workspace-body`, and `use-workspace-header`.
- Phase 3 decomposition is in-progress in `AppShell`.
