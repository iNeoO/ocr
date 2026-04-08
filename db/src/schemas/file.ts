import * as t from "drizzle-orm/pg-core";
import { pgEnum, pgTable } from "drizzle-orm/pg-core";

export const fileKind = pgEnum("file_kind", [
	"source_pdf",
	"page_image",
	"page_markdown",
	"zip",
]);

export const file = pgTable("file", {
	id: t.text("id").primaryKey(),
	kind: fileKind("kind").notNull(),
	bucket: t.text("bucket").notNull(),
	objectKey: t.text("object_key").notNull(),
	mimeType: t.text("mime_type").notNull(),
	size: t.integer("size").notNull(),
	filename: t.text("filename").notNull(),
	createdAt: t
		.timestamp("created_at", { precision: 6, withTimezone: true })
		.notNull(),
	updatedAt: t
		.timestamp("updated_at", { precision: 6, withTimezone: true })
		.notNull(),
});
