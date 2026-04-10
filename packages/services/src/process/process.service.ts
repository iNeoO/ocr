import { randomUUID } from "node:crypto";
import { type Database, schema } from "@ocr/db";
import { getLoggerStore } from "@ocr/infra";
import { APIError } from "better-auth/api";
import { and, asc, count, desc, eq, gte, lt } from "drizzle-orm";
import JSZip from "jszip";
import type { FilesService } from "../files/files.service.js";
import type {
	CreateProcessInput,
	UpdateProcessStatusInput,
} from "./process.types.js";

type SplitPdfPublisher = {
	publish(message: { processId: string }): Promise<void>;
};

type TranscribeJpgPublisher = {
	publish(message: { pageId: string }): Promise<void>;
};

type ProcessServiceDependencies = {
	db: Database;
	filesService: FilesService;
	splitPdfPublisher?: SplitPdfPublisher;
	transcribeJpgPublisher?: TranscribeJpgPublisher;
};

export class ProcessService {
	static readonly DAILY_PROCESS_LIMIT = 5;
	static readonly RETENTION_DAYS = 7;
	private readonly db: Database;
	private readonly filesService: FilesService;
	private readonly splitPdfPublisher?: SplitPdfPublisher;
	private readonly transcribeJpgPublisher?: TranscribeJpgPublisher;

	constructor({
		db,
		filesService,
		splitPdfPublisher,
		transcribeJpgPublisher,
	}: ProcessServiceDependencies) {
		this.db = db;
		this.filesService = filesService;
		this.splitPdfPublisher = splitPdfPublisher;
		this.transcribeJpgPublisher = transcribeJpgPublisher;
	}

	private getTodayWindow() {
		const start = new Date();
		start.setHours(0, 0, 0, 0);

		const end = new Date(start);
		end.setDate(end.getDate() + 1);

		return { start, end };
	}

	async assertDailyProcessLimit(userId: string) {
		const { start, end } = this.getTodayWindow();
		const [result] = await this.db
			.select({ value: count() })
			.from(schema.process)
			.where(
				and(
					eq(schema.process.userId, userId),
					gte(schema.process.createdAt, start),
					lt(schema.process.createdAt, end),
				),
			);

		const processCountToday = Number(result?.value ?? 0);

		if (processCountToday >= ProcessService.DAILY_PROCESS_LIMIT) {
			throw new APIError("TOO_MANY_REQUESTS", {
				message:
					"Daily upload limit reached. You can delete a completed or failed process to free a slot.",
			});
		}
	}

	async createProcess({ userId, fileId }: CreateProcessInput) {
		await this.assertDailyProcessLimit(userId);

		const now = new Date();
		const id = randomUUID();
		const [createdProcess] = await this.db
			.insert(schema.process)
			.values({
				id,
				userId,
				sourceFileId: fileId,
				status: "pending",
				isRunning: false,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		await this.splitPdfPublisher?.publish({ processId: id });

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
				isRunning: schema.process.isRunning,
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

	async buildProcessMarkdownZip(processId: string, userId: string) {
		const process = await this.db.query.process.findFirst({
			where: (process, { and, eq }) =>
				and(eq(process.id, processId), eq(process.userId, userId)),
		});

		if (!process) {
			throw new APIError("NOT_FOUND", {
				message: "Process not found",
			});
		}

		if (process.status !== "completed") {
			throw new APIError("CONFLICT", {
				message: "Process is not completed yet",
			});
		}

		const pages = await this.db
			.select({
				pageNumber: schema.page.pageNumber,
				markdownFileId: schema.page.markdownFileId,
			})
			.from(schema.page)
			.where(eq(schema.page.processId, processId))
			.orderBy(asc(schema.page.pageNumber));

		const zip = new JSZip();

		for (const page of pages) {
			if (!page.markdownFileId) {
				throw new APIError("CONFLICT", {
					message: "Process output is incomplete",
				});
			}

			const buffer = await this.filesService.getFileBuffer(page.markdownFileId);
			zip.file(`page${page.pageNumber}.md`, buffer);
		}

		const archive = await zip.generateAsync({
			type: "nodebuffer",
			compression: "DEFLATE",
			compressionOptions: {
				level: 6,
			},
		});

		return {
			filename: `process-${processId}.zip`,
			buffer: archive,
		};
	}

	async deleteProcess(processId: string, userId: string) {
		const process = await this.db.query.process.findFirst({
			where: (process, { and, eq }) =>
				and(eq(process.id, processId), eq(process.userId, userId)),
		});

		if (!process) {
			throw new APIError("NOT_FOUND", {
				message: "Process not found",
			});
		}

		if (process.status !== "completed" && process.status !== "failed") {
			throw new APIError("CONFLICT", {
				message: "Process can only be deleted when completed or failed",
			});
		}

		const pages = await this.db
			.select({
				imageFileId: schema.page.imageFileId,
				markdownFileId: schema.page.markdownFileId,
			})
			.from(schema.page)
			.where(eq(schema.page.processId, processId));

		const fileIds = [
			process.sourceFileId,
			process.zipFileId,
			...pages.flatMap((page) => [page.imageFileId, page.markdownFileId]),
		].filter((fileId): fileId is string => Boolean(fileId));

		const logger = getLoggerStore();
		logger.info(
			{
				processId,
				userId,
				status: process.status,
				fileCount: fileIds.length,
				pageCount: pages.length,
			},
			"Deleting process and related files",
		);

		await this.db.delete(schema.process).where(
			and(eq(schema.process.id, processId), eq(schema.process.userId, userId)),
		);
		await this.filesService.deleteFiles(fileIds);
	}

	async cleanupExpiredProcesses() {
		const cutoff = new Date(Date.now() - ProcessService.RETENTION_DAYS * 24 * 60 * 60 * 1000);
		const expiredCompletedProcesses = await this.db
			.select({
				id: schema.process.id,
				userId: schema.process.userId,
				status: schema.process.status,
				completedAt: schema.process.completedAt,
				errorAt: schema.process.errorAt,
			})
			.from(schema.process)
			.where(
				and(
					eq(schema.process.status, "completed"),
					lt(schema.process.completedAt, cutoff),
				),
			)
		const expiredFailedProcesses = await this.db
			.select({
				id: schema.process.id,
				userId: schema.process.userId,
				status: schema.process.status,
				completedAt: schema.process.completedAt,
				errorAt: schema.process.errorAt,
			})
			.from(schema.process)
			.where(
				and(
					eq(schema.process.status, "failed"),
					lt(schema.process.errorAt, cutoff),
				),
			);
		const expiredProcesses = [
			...expiredCompletedProcesses,
			...expiredFailedProcesses,
		];

		const logger = getLoggerStore();
		logger.info(
			{
				cutoff,
				processCount: expiredProcesses.length,
			},
			"Found expired processes to delete",
		);

		for (const process of expiredProcesses) {
			await this.deleteProcess(process.id, process.userId);
		}

		return expiredProcesses.length;
	}

	async splitSourceFileIntoPages(processId: string) {
		const process = await this.getProcessById(processId);
		if (!process) {
			throw new Error("Process not found");
		}

		const startedAt = process.startedAt ?? new Date();
		await this.updateProcessStatus({
			id: processId,
			status: "splitting",
			isRunning: true,
		});
		await this.db
			.update(schema.process)
			.set({
				startedAt,
				updatedAt: new Date(),
				error: null,
				errorAt: null,
			})
			.where(eq(schema.process.id, processId));

		try {
			const images = await this.filesService.splitFileIntoPages(
				process.sourceFileId,
			);
			const now = new Date();
			const logger = getLoggerStore();
			logger.info(
				{
					processId,
					sourceFileId: process.sourceFileId,
					pageCount: images.length,
				},
				"Split PDF into page images",
			);

			const pages = await Promise.all(
				images.map(async (image) => {
					const pageId = randomUUID();
					const [createdPage] = await this.db
						.insert(schema.page)
						.values({
							id: pageId,
							processId,
							pageNumber: image.pageNumber,
							imageFileId: image.imageFileId,
							status: "pending",
							attemptCount: 0,
							createdAt: now,
							updatedAt: now,
						})
						.returning();

					await this.transcribeJpgPublisher?.publish({ pageId });
					logger.info(
						{
							processId,
							pageId,
							pageNumber: image.pageNumber,
							imageFileId: image.imageFileId,
						},
						"Created page and published transcribe JPG job",
					);
					return createdPage;
				}),
			);

			const [updatedProcess] = await this.db
				.update(schema.process)
				.set({
					status: "splitting",
					isRunning: false,
					pageCount: pages.length,
					updatedAt: new Date(),
				})
				.where(eq(schema.process.id, processId))
				.returning();

			return updatedProcess;
		} catch (error) {
			const logger = getLoggerStore();
			logger.error(
				{ err: error, processId },
				"Failed to split process source PDF",
			);

			const message =
				error instanceof Error
					? error.message
					: "Unknown error while splitting process source PDF";

			await this.failProcess(processId, message);

			throw error;
		}
	}

	async completeProcess(processId: string, completedPages: number) {
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({
				status: "completed",
				isRunning: false,
				completedPages,
				completedAt: now,
				updatedAt: now,
			})
			.where(eq(schema.process.id, processId))
			.returning();
		return updatedProcess;
	}

	async failProcess(processId: string, error: string) {
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({
				status: "failed",
				isRunning: false,
				error,
				errorAt: now,
				updatedAt: now,
			})
			.where(eq(schema.process.id, processId))
			.returning();
		return updatedProcess;
	}

	async updateProcessStatus({
		id,
		status,
		isRunning,
	}: UpdateProcessStatusInput) {
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({
				status,
				...(typeof isRunning === "boolean" ? { isRunning } : {}),
				updatedAt: now,
			})
			.where(eq(schema.process.id, id))
			.returning();
		return updatedProcess;
	}
}
