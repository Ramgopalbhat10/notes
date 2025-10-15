# Story 9 — Robust S3 Listing & Folder Semantics

Goal: Make the file tree reliable across S3-compatible providers by (1) switching to a fetch-based S3 client and (2) rewriting the builder to derive folders from a flat listing, including handling zero‑byte folder markers and preserving trailing slashes.

## Scope
- In: `lib/s3.ts`, `lib/file-tree-builder.ts`, `app/api/fs/list/route.ts`, `app/api/fs/mkdir/route.ts`, `scripts/build-file-tree.ts`.
- Out: Non-S3 backends, offline caches, ISR of the manifest.

## Deliverables
- Fetch-based S3 client using `aws4fetch` that supports path-style addressing and preserves trailing `/` in keys.
- ListObjectsV2 XML parsing with delimiter fallback when providers ignore `CommonPrefixes`.
- File-tree builder that scans a flat listing, derives ancestor folders, and treats zero-byte non‑md objects as folder markers.
- Folder listing API that recognizes folder markers even when returned as `Contents`.
- CLI debug flag to print discovered keys during manifest builds.

## Acceptance Criteria
- Creating a folder (e.g., `1. Projects/MRGB - Notes/`) appears immediately in the UI and in the generated manifest.
- `pnpm -s tsx scripts/build-file-tree.ts --dry-run --pretty --out .cache/file-tree/manifest.json --debug` prints > 1 object and includes top-level folders and `.md` files.
- Listing is stable whether the provider returns `CommonPrefixes`, folder markers in `Contents`, or both.

---

## Story 9.1 — S3 Wrapper Enhancements (`lib/s3.ts`)
- Sub-tasks
  - [x] Implement fetch-based client with `AwsClient` (aws4fetch) and path-style URLs.
  - [x] Preserve trailing `/` in `objUrl()` so folder marker writes/reads use exact keys.
  - [x] Parse ListObjectsV2 XML (`Contents`, `CommonPrefixes`, `NextContinuationToken`).
  - [x] Add delimiter fallback: re-list without `Delimiter` and synthesize `CommonPrefixes` if missing.
  - [x] Use `max-keys=1000`; support `ContinuationToken`.
  - [x] Support `HeadObject`, `GetObject`, `PutObject` (string/Uint8Array), `DeleteObject(s)`, `CopyObject`.
- Test Plan
  - Run builder with `--debug`; verify keys include folders (with `/`) and files, and pagination works if needed.

---

## Story 9.2 — File-Tree Builder Rewrite (`lib/file-tree-builder.ts`)
- Sub-tasks
  - [x] Perform flat scan of all objects under `applyVaultPrefix("")`.
  - [x] Derive ancestor folders for every object key.
  - [x] Treat keys ending with `/` as folders; treat zero-byte non‑md `Contents` as folder markers.
  - [x] Include only `.md` files as file nodes; still materialize folder nodes for structure.
  - [x] Populate `childrenIds`, `rootIds`, and metadata; exclude the manifest itself from nodes.
- Test Plan
  - `pnpm run tree:build` creates a manifest with multiple nodes (folders + `.md` files).
  - Inspect a sample (`3. Resources/Guides/Setup/…`) to verify hierarchy and children.

---

## Story 9.3 — Folder Listing & Creation Semantics
- Sub-tasks
  - [x] List API (`app/api/fs/list/route.ts`) synthesizes folders from zero‑byte non‑md `Contents` under the requested prefix.
  - [x] Mkdir API (`app/api/fs/mkdir/route.ts`) ensures the key ends with `/` and uses `ContentType: application/x-directory`.
  - [x] Ensure the S3 client preserves trailing `/` when writing/reading markers.
- Test Plan
  - Create `1. Projects/MRGB - Notes/`; expand `1. Projects/` in UI — new folder appears; manifest shows the folder after refresh.

---

## Definition of Done
- Listing and builder work across providers that differ in delimiter handling and folder markers.
- Empty folders created in the UI are visible immediately and survive across refreshes.
- Manifest generation is deterministic and includes accurate hierarchy and metadata.
