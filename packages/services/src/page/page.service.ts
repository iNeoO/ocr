import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { type Database, schema } from "@ocr/db";
import { getLoggerStore } from "@ocr/infra";
import { s3, s3Config } from "@ocr/infra/s3";
import { count, eq, sql } from "drizzle-orm";
import { createWorker } from "tesseract.js";
import type { FilesService } from "../files/files.service.js";
import type { ProcessService } from "../process/process.service.js";
import type { UpdatePageStatusInput } from "./page.types.js";

type PageServiceDependencies = {
	db: Database;
	filesService: FilesService;
	processService: ProcessService;
};

export class PageService {
	private readonly db: Database;
	private readonly filesService: FilesService;
	private readonly processService: ProcessService;

	constructor({ db, filesService, processService }: PageServiceDependencies) {
		this.db = db;
		this.filesService = filesService;
		this.processService = processService;
	}

	async getPageById(id: string) {
		return this.db.query.page.findFirst({
			where: (page, { eq }) => eq(page.id, id),
		});
	}

	async transcribePage(pageId: string) {
		const logger = getLoggerStore();
		const page = await this.getPageById(pageId);
		if (!page) {
			throw new Error("Page not found");
		}

		if (!page.imageFileId) {
			throw new Error("Page image file not found");
		}

		await this.db
			.update(schema.page)
			.set({
				status: "processing",
				attemptCount: sql`${schema.page.attemptCount} + 1`,
				error: null,
				errorAt: null,
				updatedAt: new Date(),
			})
			.where(eq(schema.page.id, pageId));
		logger.info(
			{
				pageId,
				processId: page.processId,
				pageNumber: page.pageNumber,
				imageFileId: page.imageFileId,
			},
			"Started page transcription",
		);

		try {
			const image = await this.filesService.getFileById(page.imageFileId);
			if (!image) {
				throw new Error("Page image record not found");
			}
			logger.info(
				{
					pageId,
					processId: page.processId,
					imageFileId: image.id,
					objectKey: image.objectKey,
				},
				"Loaded page image metadata",
			);

			const buffer = Buffer.from(
				await this.filesService.getFileBuffer(page.imageFileId),
			);
			logger.info(
				{
					pageId,
					processId: page.processId,
					bytes: buffer.length,
				},
				"Downloaded page image buffer",
			);
			const worker = await createWorker("eng");
			logger.info(
				{ pageId, processId: page.processId },
				"Created tesseract worker",
			);

			try {
				const result = await worker.recognize(buffer);
				const text = result.data.text.trim();
				logger.info(
					{
						pageId,
						processId: page.processId,
						textLength: text.length,
					},
					"Finished OCR recognition",
				);
				const now = new Date();
				const markdownFileId = randomUUID();
				const filename = `page-${page.pageNumber}.md`;
				const objectKey = `pages/${page.id}/${markdownFileId}.md`;
				const body = Buffer.from(text, "utf-8");

				await s3.send(
					new PutObjectCommand({
						Bucket: s3Config.bucket,
						Key: objectKey,
						Body: body,
						ContentLength: body.length,
						ContentType: "text/markdown; charset=utf-8",
					}),
				);
				logger.info(
					{
						pageId,
						processId: page.processId,
						markdownFileId,
						objectKey,
						size: body.length,
					},
					"Uploaded markdown file to storage",
				);

				await this.db.insert(schema.file).values({
					id: markdownFileId,
					kind: "page_markdown",
					bucket: s3Config.bucket,
					objectKey,
					mimeType: "text/markdown",
					size: body.length,
					filename,
					createdAt: now,
					updatedAt: now,
				});

				const updatedPage = await this.updatePageStatus({
					id: pageId,
					status: "completed",
					error: null,
					markdownFileId,
				});
				logger.info(
					{
						pageId,
						processId: page.processId,
						markdownFileId,
					},
					"Marked page as completed",
				);

				await this.syncProcessProgress(page.processId);
				return updatedPage;
			} finally {
				await worker.terminate();
				logger.info(
					{ pageId, processId: page.processId },
					"Terminated tesseract worker",
				);
			}
		} catch (error) {
			logger.error({ err: error, pageId }, "Failed to transcribe page");

			const message =
				error instanceof Error
					? error.message
					: "Unknown error while transcribing page";

			await this.updatePageStatus({
				id: pageId,
				status: "failed",
				error: message,
			});
			await this.processService.failProcess(page.processId, message);
			throw error;
		}
	}

	async syncProcessProgress(processId: string) {
		const logger = getLoggerStore();
		const [aggregate] = await this.db
			.select({
				total: count(),
				completed: sql<number>`count(*) filter (where ${schema.page.status} = 'completed')`,
				failed: sql<number>`count(*) filter (where ${schema.page.status} = 'failed')`,
				processing: sql<number>`count(*) filter (where ${schema.page.status} = 'processing')`,
			})
			.from(schema.page)
			.where(eq(schema.page.processId, processId));

		const total = Number(aggregate?.total ?? 0);
		const completed = Number(aggregate?.completed ?? 0);
		const failed = Number(aggregate?.failed ?? 0);
		const processing = Number(aggregate?.processing ?? 0);
		logger.info(
			{
				processId,
				total,
				completed,
				failed,
				processing,
			},
			"Computed process progress from pages",
		);

		if (failed > 0) {
			await this.processService.failProcess(
				processId,
				"One or more pages failed to transcribe",
			);
			logger.warn({ processId }, "Marked process as failed from page statuses");
			return;
		}

		if (total > 0 && completed === total) {
			await this.processService.completeProcess(processId, completed);
			logger.info(
				{ processId, completedPages: completed },
				"Marked process as completed",
			);
			return;
		}

		if (processing > 0 || completed > 0) {
			await this.processService.updateProcessStatus({
				id: processId,
				status: "processing",
				isRunning: processing > 0,
			});

			await this.db
				.update(schema.process)
				.set({
					completedPages: completed,
					updatedAt: new Date(),
				})
				.where(eq(schema.process.id, processId));
			logger.info(
				{
					processId,
					completedPages: completed,
					isRunning: processing > 0,
				},
				"Updated process progress counters",
			);
		}
	}

	async updatePageStatus({
		id,
		status,
		error,
		markdownFileId,
	}: UpdatePageStatusInput) {
		const now = new Date();
		const [updatedPage] = await this.db
			.update(schema.page)
			.set({
				status,
				error: error ?? null,
				errorAt: status === "failed" ? now : null,
				markdownFileId:
					typeof markdownFileId === "string" ? markdownFileId : undefined,
				updatedAt: now,
			})
			.where(eq(schema.page.id, id))
			.returning();

		return updatedPage;
	}
}
