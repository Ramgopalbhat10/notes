# 2026-09-13-ensure-ancestor-folders-must-skip-target

- Area: `api`
- Context: Story 29 `create_folder` chat tool mkdir-p's ancestors then creates the target with `existOk: false`.
- Symptom: Creating a new folder from chat returned `exists` / HTTP 409 even when the folder did not exist.
- Root cause: `ensureAncestorFolders` treated a trailing-slash folder prefix as the folder to create, so it created the target with `existOk: true` before `createVaultFolder({ existOk: false })` ran.
- Fix: Always walk `getParentPath(childPath)` only. File writes (`scratch/a.md`) and folder creates (`scratch/a/`) share the same parent walk.
- Guardrails: Do not pass a folder prefix through `ensureAncestorFolders` as if it were a parent list. `existOk: true` is only for ancestors; the leaf create must still 409 if it already exists.
- References: `lib/fs/create-folder.ts`, `lib/ai/vault-tools.ts`, `docs/stories/story-29.md`
