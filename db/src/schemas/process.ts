import * as t from "drizzle-orm/pg-core";
import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { file } from "./file.js";
import { user } from "./user.js";

export const processStatus = pgEnum("process_status", [
	"pending",
	"splitting",
	"processing",
	"finalizing",
	"completed",
	"failed",
]);

export const process = pgTable("process", {
	id: t.text("id").primaryKey(),
	userId: t
		.text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	sourceFileId: t
		.text("source_file_id")
		.notNull()
		.references(() => file.id, { onDelete: "restrict" }),
	zipFileId: t
		.text("zip_file_id")
		.references(() => file.id, { onDelete: "set null" }),
	status: processStatus("status").notNull().default("pending"),
	isRunning: t.boolean("is_running").notNull().default(false),
	pageCount: t.integer("page_count").notNull().default(0),
	completedPages: t.integer("completed_pages").notNull().default(0),
	createdAt: t
		.timestamp("created_at", { precision: 6, withTimezone: true })
		.notNull(),
	startedAt: t.timestamp("started_at", { precision: 6, withTimezone: true }),
	updatedAt: t
		.timestamp("updated_at", { precision: 6, withTimezone: true })
		.notNull(),
	completedAt: t.timestamp("completed_at", { precision: 6, withTimezone: true }),
	errorAt: t.timestamp("error_at", { precision: 6, withTimezone: true }),
	error: t.text("error"),
});
