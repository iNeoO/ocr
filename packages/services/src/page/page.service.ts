import { existsSync } from "node:fs";
import path from "node:path";
import { APP_ERROR, type ProcessStatusStage } from "@ocr/common";
import { type Database, schema } from "@ocr/db";
import { getLoggerStore, InternalError } from "@ocr/infra";
import type { PostProcessPagePublisher } from "@ocr/post-process-page-worker/publisher";
import { count, eq, sql } from "drizzle-orm";
import { createWorker } from "tesseract.js";
import type { FilesService } from "../files/files.service.js";
import type { LlmService } from "../llm/llm.service.js";
import type { ProcessService } from "../process/process.service.js";
import type { UpdatePageStatusInput } from "./page.types.js";

type PageServiceDependencies = {
	db: Database;
	filesService: FilesService;
	processService: ProcessService;
	llmService: LlmService;
	postProcessPagePublisher: PostProcessPagePublisher;
};

export class PageService {
	private static readonly OCR_LANGUAGE_PATH_CANDIDATES = [
		path.join(process.cwd(), "workers/transcribe-jpg-worker"),
		path.join(process.cwd(), "../../workers/transcribe-jpg-worker"),
	];

	private readonly db: Database;
	private readonly filesService: FilesService;
	private readonly processService: ProcessService;
	private readonly llmService: LlmService;
	private readonly postProcessPagePublisher: PostProcessPagePublisher;

	constructor({
		db,
		filesService,
		processService,
		llmService,
		postProcessPagePublisher,
	}: PageServiceDependencies) {
		this.db = db;
		this.filesService = filesService;
		this.processService = processService;
		this.llmService = llmService;
		this.postProcessPagePublisher = postProcessPagePublisher;
	}

	private async createOcrWorker({
		pageId,
		processId,
	}: {
		pageId: string;
		processId: string;
	}) {
		const logger = getLoggerStore();
		const langPath = PageService.OCR_LANGUAGE_PATH_CANDIDATES.find(
			(candidate) => existsSync(path.join(candidate, "eng.traineddata")),
		);
		const workerOptions = langPath
			? {
					langPath,
					cacheMethod: "none" as const,
					gzip: false,
				}
			: {
					cacheMethod: "none" as const,
				};

		try {
			return await createWorker("fra+eng", undefined, workerOptions);
		} catch (error) {
			logger.warn(
				{ err: error, pageId, processId, langPath },
				"Failed to create French OCR worker, falling back to English",
			);
			return createWorker("eng", undefined, workerOptions);
		}
	}

	private buildPageMarkdownContent({
		nativeText,
		ocrText,
	}: {
		nativeText?: string | null;
		ocrText: string;
	}) {
		const trimmedNativeText = nativeText?.trim();
		const trimmedOcrText = ocrText.trim();

		if (!trimmedNativeText) {
			return trimmedOcrText;
		}

		return [
			"## PDF text extraction",
			trimmedNativeText,
			"## OCR text extraction",
			trimmedOcrText || "_No OCR text detected._",
		].join("\n\n");
	}

	async getPageById(id: string) {
		return this.db.query.page.findFirst({
			where: (page, { eq }) => eq(page.id, id),
		});
	}

	async publishProcessStatusEventForPage({
		pageId,
		stage,
		status,
		durationMs,
		message,
	}: {
		pageId: string;
		stage: ProcessStatusStage;
		status: "success" | "failed";
		durationMs: number;
		message: string;
	}) {
		const page = await this.getPageById(pageId);
		if (!page) {
			throw new InternalError({
				code: APP_ERROR.PAGE_NOT_FOUND,
				message: "Page not found",
			});
		}

		await this.processService.publishProcessStatusEvent({
			processId: page.processId,
			stage,
			status,
			durationMs,
			message,
		});
	}

	async transcribePage(pageId: string) {
		const logger = getLoggerStore();
		const page = await this.getPageById(pageId);
		if (!page) {
			throw new InternalError({
				code: APP_ERROR.PAGE_NOT_FOUND,
				message: "Page not found",
			});
		}

		if (!page.imageFileId) {
			throw new InternalError({
				code: APP_ERROR.PAGE_IMAGE_FILE_MISSING,
				message: "Page image file not found",
			});
		}

		const nativeText = page.markdownFileId
			? await this.filesService.getFileText(page.markdownFileId)
			: null;

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
				throw new InternalError({
					code: APP_ERROR.PAGE_IMAGE_FILE_NOT_FOUND,
					message: "Page image record not found",
				});
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
			const worker = await this.createOcrWorker({
				pageId,
				processId: page.processId,
			});
			logger.info(
				{ pageId, processId: page.processId },
				"Created tesseract worker",
			);

			try {
				const result = await worker.recognize(buffer);
				const text = result.data.text.trim();
				const markdownContent = this.buildPageMarkdownContent({
					nativeText,
					ocrText: text,
				});
				logger.info(
					{
						pageId,
						processId: page.processId,
						textLength: text.length,
						nativeTextLength: nativeText?.length ?? 0,
						markdownContentLength: markdownContent.length,
					},
					"Finished OCR recognition",
				);
				const now = new Date();
				const markdownFileId =
					page.markdownFileId ??
					(await this.createMarkdownFile({
						pageId: page.id,
						pageNumber: page.pageNumber,
						content: markdownContent,
						now,
					}));

				if (page.markdownFileId) {
					await this.filesService.replaceFileContent(
						page.markdownFileId,
						markdownContent,
					);
					logger.info(
						{
							pageId,
							processId: page.processId,
							markdownFileId: page.markdownFileId,
						},
						"Replaced markdown content with native PDF text and OCR text",
					);
				}

				const updatedPage = await this.updatePageStatus({
					id: pageId,
					status: "post_processing",
					error: null,
					markdownFileId,
				});
				logger.info(
					{
						pageId,
						processId: page.processId,
						markdownFileId,
					},
					"Marked page as awaiting post-processing",
				);

				await this.postProcessPagePublisher?.publish({ pageId });
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

	async postProcessPage(pageId: string) {
		const logger = getLoggerStore();
		const page = await this.getPageById(pageId);
		if (!page) {
			throw new InternalError({
				code: APP_ERROR.PAGE_NOT_FOUND,
				message: "Page not found",
			});
		}

		if (!page.imageFileId) {
			throw new InternalError({
				code: APP_ERROR.PAGE_IMAGE_FILE_MISSING,
				message: "Page image file not found",
			});
		}

		if (!page.markdownFileId) {
			throw new InternalError({
				code: APP_ERROR.PAGE_MARKDOWN_FILE_MISSING,
				message: "Page markdown file not found",
			});
		}

		if (!this.llmService) {
			throw new InternalError({
				code: APP_ERROR.LLM_SERVICE_NOT_CONFIGURED,
				message: "LLM service not configured",
			});
		}

		await this.updatePageStatus({
			id: pageId,
			status: "post_processing",
			error: null,
		});
		logger.info(
			{
				pageId,
				processId: page.processId,
				pageNumber: page.pageNumber,
				markdownFileId: page.markdownFileId,
			},
			"Started page post-processing",
		);

		try {
			const [imageBuffer, currentMarkdown] = await Promise.all([
				this.filesService.getFileBuffer(page.imageFileId),
				this.filesService.getFileText(page.markdownFileId),
			]);
			const refinedMarkdown = await this.llmService.refinePageMarkdown({
				imageBuffer,
				currentMarkdown,
			});

			await this.filesService.replaceFileContent(
				page.markdownFileId,
				refinedMarkdown,
			);

			const updatedPage = await this.updatePageStatus({
				id: pageId,
				status: "completed",
				error: null,
			});
			logger.info(
				{
					pageId,
					processId: page.processId,
					markdownFileId: page.markdownFileId,
					textLength: refinedMarkdown.length,
				},
				"Finished page post-processing",
			);

			await this.syncProcessProgress(page.processId);
			return updatedPage;
		} catch (error) {
			logger.error({ err: error, pageId }, "Failed to post-process page");

			const message =
				error instanceof Error
					? error.message
					: "Unknown error while post-processing page";

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
				postProcessing: sql<number>`count(*) filter (where ${schema.page.status} = 'post_processing')`,
			})
			.from(schema.page)
			.where(eq(schema.page.processId, processId));

		const total = Number(aggregate?.total ?? 0);
		const completed = Number(aggregate?.completed ?? 0);
		const failed = Number(aggregate?.failed ?? 0);
		const processing = Number(aggregate?.processing ?? 0);
		const postProcessing = Number(aggregate?.postProcessing ?? 0);
		logger.info(
			{
				processId,
				total,
				completed,
				failed,
				processing,
				postProcessing,
			},
			"Computed process progress from pages",
		);

		if (failed > 0) {
			await this.processService.failProcess(
				processId,
				"One or more pages failed during OCR or post-processing",
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

		if (processing > 0) {
			await this.processService.updateProcessStatus({
				id: processId,
				status: "processing",
				isRunning: true,
			});
		} else if (postProcessing > 0 || completed > 0) {
			await this.processService.updateProcessStatus({
				id: processId,
				status: "post_processing",
				isRunning: postProcessing > 0,
			});
		}

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
				isRunning: processing > 0 || postProcessing > 0,
			},
			"Updated process progress counters",
		);
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

	private async createMarkdownFile({
		pageId,
		pageNumber,
		content,
		now,
	}: {
		pageId: string;
		pageNumber: number;
		content: string;
		now: Date;
	}) {
		return this.filesService.createPageMarkdownFile({
			pageId,
			pageNumber,
			content,
			now,
		});
	}
}
