import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Application-level tables (non-auth).
 *
 * Kept separate from `drizzle/schema.ts` so that `pnpm auth:schema`
 * (which overwrites `drizzle/schema.ts` with only Better-Auth tables)
 * does not clobber application tables.
 */
export const fileVersions = sqliteTable(
  "file_versions",
  {
    id: text("id").primaryKey(),
    fileKey: text("file_key").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    size: integer("size").notNull(),
    etag: text("etag"),
    authorId: text("author_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("file_versions_key_created_idx").on(table.fileKey, table.createdAt),
  ],
);
