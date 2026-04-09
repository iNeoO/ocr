import { randomUUID } from "node:crypto";
import { type Database, schema } from "@ocr/db";
import { desc, eq } from "drizzle-orm";
import type {
	CreateProcessInput,
	UpdateProcessStatusInput,
} from "./process.types.js";

export class ProcessService {
	private readonly db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	async createProcess({ userId, fileId }: CreateProcessInput) {
		const now = new Date();
		const id = randomUUID();
		const [createdProcess] = await this.db
			.insert(schema.process)
			.values({
				id,
				userId,
				sourceFileId: fileId,
				status: "pending",
				createdAt: now,
				updatedAt: now,
			})
			.returning();
		return createdProcess;
	}

	async getProcessById(id: string) {
		const process = await this.db.query.process.findFirst({
			where: (process, { eq }) => eq(process.id, id),
		});
		return process;
	}

	async getProcessesByUserId(userId: string) {
		const processes = await this.db
			.select({
				id: schema.process.id,
				userId: schema.process.userId,
				sourceFileId: schema.process.sourceFileId,
				zipFileId: schema.process.zipFileId,
				status: schema.process.status,
				pageCount: schema.process.pageCount,
				completedPages: schema.process.completedPages,
				createdAt: schema.process.createdAt,
				startedAt: schema.process.startedAt,
				updatedAt: schema.process.updatedAt,
				completedAt: schema.process.completedAt,
				errorAt: schema.process.errorAt,
				error: schema.process.error,
				sourceFileName: schema.file.filename,
			})
			.from(schema.process)
			.innerJoin(schema.file, eq(schema.process.sourceFileId, schema.file.id))
			.where(eq(schema.process.userId, userId))
			.orderBy(desc(schema.process.createdAt));
		return processes;
	}

	async updateProcessStatus({ id, status }: UpdateProcessStatusInput) {
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({ status, updatedAt: now })
			.where(eq(schema.process.id, id))
			.returning();
		return updatedProcess;
	}
}
