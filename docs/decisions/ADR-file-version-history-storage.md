# ADR: File Version History Storage in Turso

## Context

The markdown vault app stores file content in Tigris (S3-compatible) and overwrites objects in place on every save — no history is kept. A version history feature needs to store the latest 5 versions per file, list them ordered, and support rollback. The app already uses Turso (SQLite via `@libsql/client` + drizzle-orm) for Better-Auth tables and has a clean migration workflow (`pnpm db:generate` / `db:migrate`).

## Decision

Store version history snapshots (content + metadata) in Turso via a new `file_versions` table.

## Alternatives Considered

1. **S3 native object versioning** — Tigris versioning API support (`ListObjectVersions` / `GetObjectVersion`) is less universally implemented than core S3. Captures every overwrite (incl. autosaves) with no dedup. "Latest 5 + current" requires paginated listing with no clean SQL ordering/cap. No metadata (author, labels) without sidecar storage.

2. **S3 with custom `.versions/{key}/` prefix** — Pollutes the bucket; requires excluding `.versions/` from the file-tree list route and manifest builder. Listing S3 by prefix is slower/paginated vs. SQL. More API calls per save. Cleanup-on-delete/rename is fiddlier.

3. **Hybrid: Turso index + S3 content blobs** — Turso stores metadata + S3 version-object key; content lives in S3. Most complex — two systems to keep consistent. Only worth it for large/binary files (markdown notes are small text).

## Consequences

- Adds one DB write (single-row insert + bounded prune) to the save path — minimal cost for small text.
- DB grows with versions, but capped at 5/file so minimal.
- Version data stays entirely out of the S3 vault prefix — tree/manifest/list code is untouched.
- SQL makes "latest 5 + current, ordered" trivial and fast.
- Full control over dedup (content-hash skip) and retention (prune-to-5).
- Future upgrade path: move `content` column to S3 blobs (Option D) if files grow large or infinite retention is needed.

## Rollout/Notes

- `fileVersions` table added to `drizzle/schema.ts` alongside Better-Auth tables.
- `auth:schema` (better-auth generate) only manages its own tables, so app tables survive regeneration. If this proves fragile, move app tables to a separate `drizzle/app-schema.ts` and combine both in `drizzle.config.ts`.
