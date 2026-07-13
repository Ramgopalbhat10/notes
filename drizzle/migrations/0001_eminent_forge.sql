CREATE TABLE `file_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`file_key` text NOT NULL,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`size` integer NOT NULL,
	`etag` text,
	`author_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `file_versions_key_created_idx` ON `file_versions` (`file_key`,`created_at`);