import * as t from "drizzle-orm/pg-core";
import { pgEnum, pgTable, unique } from "drizzle-orm/pg-core";
import { file } from "./file.js";
import { process } from "./process.js";

export const pageStatus = pgEnum("page_status", [
	"pending",
	"processing",
	"post_processing",
	"completed",
	"failed",
]);

export const page = pgTable(
	"page",
	{
		id: t.text("id").primaryKey(),
		processId: t
			.text("process_id")
			.notNull()
			.references(() => process.id, { onDelete: "cascade" }),
		pageNumber: t.integer("page_number").notNull(),
		imageFileId: t
			.text("image_file_id")
			.references(() => file.id, { onDelete: "set null" }),
		markdownFileId: t
			.text("markdown_file_id")
			.references(() => file.id, { onDelete: "set null" }),
		status: pageStatus("status").notNull().default("pending"),
		attemptCount: t.integer("attempt_count").notNull().default(0),
		errorAt: t.timestamp("error_at", { precision: 6, withTimezone: true }),
		error: t.text("error"),
		createdAt: t
			.timestamp("created_at", { precision: 6, withTimezone: true })
			.notNull(),
		updatedAt: t
			.timestamp("updated_at", { precision: 6, withTimezone: true })
			.notNull(),
	},
	(table) => [
		unique("page_process_id_page_number_unique").on(
			table.processId,
			table.pageNumber,
		),
	],
);
