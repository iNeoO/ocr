import { randomUUID } from "node:crypto";
import { type Database, schema } from "@ocr/db";
import { eq } from "drizzle-orm";
import type {
	CreateProcessInput,
	ProcessServiceOptions,
	UpdateProcessStatusInput,
} from "./process.types.js";

export class ProcessService {
	private readonly db: Database;

	constructor({ db }: ProcessServiceOptions) {
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
