import { randomUUID } from "node:crypto";
import type { BuildZipPublisher } from "@ocr/build-zip-worker/publisher";
import { APP_ERROR } from "@ocr/common";
import { type Database, schema } from "@ocr/db";
import { getLoggerStore, InternalError } from "@ocr/infra";
import type { MergeMarkdownPublisher } from "@ocr/merge-markdown-worker/publisher";
import type { SplitPdfPublisher } from "@ocr/split-pdf-worker/publisher";
import type { TranscribeJpgPublisher } from "@ocr/transcribe-jpg-worker/publisher";
import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	lt,
	notInArray,
	sql,
} from "drizzle-orm";
import JSZip from "jszip";
import type { FilesService } from "../files/files.service.js";
import type {
	ProcessNotificationContext,
	PublishProcessStatusEventInput,
} from "../process-status/process-status.types.js";
import type { ProcessStatusPubSubService } from "../process-status/process-status-pubsub.service.js";
import type {
	CreateProcessInput,
	UpdateProcessStatusInput,
} from "./process.types.js";

type ProcessServiceDependencies = {
	db: Database;
	filesService: FilesService;
	splitPdfPublisher?: SplitPdfPublisher;
	transcribeJpgPublisher?: TranscribeJpgPublisher;
	buildZipPublisher?: BuildZipPublisher;
	mergeMarkdownPublisher?: MergeMarkdownPublisher;
	processStatusPubSubService?: ProcessStatusPubSubService;
};

export class ProcessService {
	static readonly DAILY_PROCESS_LIMIT = 5;
	static readonly RETENTION_DAYS = 7;
	private readonly db: Database;
	private readonly filesService: FilesService;
	private readonly splitPdfPublisher?: SplitPdfPublisher;
	private readonly transcribeJpgPublisher?: TranscribeJpgPublisher;
	private readonly buildZipPublisher?: BuildZipPublisher;
	private readonly mergeMarkdownPublisher?: MergeMarkdownPublisher;
	private readonly processStatusPubSubService?: ProcessStatusPubSubService;

	constructor({
		db,
		filesService,
		splitPdfPublisher,
		transcribeJpgPublisher,
		buildZipPublisher,
		mergeMarkdownPublisher,
		processStatusPubSubService,
	}: ProcessServiceDependencies) {
		this.db = db;
		this.filesService = filesService;
		this.splitPdfPublisher = splitPdfPublisher;
		this.transcribeJpgPublisher = transcribeJpgPublisher;
		this.buildZipPublisher = buildZipPublisher;
		this.mergeMarkdownPublisher = mergeMarkdownPublisher;
		this.processStatusPubSubService = processStatusPubSubService;
	}

	private getTodayWindow() {
		const start = new Date();
		start.setHours(0, 0, 0, 0);

		const end = new Date(start);
		end.setDate(end.getDate() + 1);

		return { start, end };
	}

	private hasUsableNativeText(text: string | undefined) {
		if (!text) {
			return false;
		}

		const words = text.match(/\p{L}[\p{L}\p{N}'’.-]*/gu) ?? [];
		return text.trim().length >= 80 && words.length >= 12;
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
			throw new InternalError({
				code: APP_ERROR.PROCESS_DAILY_LIMIT_REACHED,
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

	async getProcessForUser(processId: string, userId: string) {
		const process = await this.db.query.process.findFirst({
			where: (process, { and, eq }) =>
				and(eq(process.id, processId), eq(process.userId, userId)),
		});

		if (!process) {
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_FOUND,
				message: "Process not found",
			});
		}

		return process;
	}

	async getProcessNotificationContextByProcessId(
		processId: string,
	): Promise<ProcessNotificationContext> {
		const process = await this.db
			.select({
				processId: schema.process.id,
				userId: schema.process.userId,
				sourceFileName: schema.file.filename,
			})
			.from(schema.process)
			.innerJoin(schema.file, eq(schema.process.sourceFileId, schema.file.id))
			.where(eq(schema.process.id, processId))
			.limit(1)
			.then((rows) => rows[0]);

		if (!process) {
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_FOUND,
				message: "Process not found",
			});
		}

		return {
			userId: process.userId,
			processId: process.processId,
			processName: process.processId,
			sourceFileName: process.sourceFileName,
		};
	}

	async publishProcessStatusEvent({
		processId,
		stage,
		status,
		durationMs,
		message,
	}: PublishProcessStatusEventInput) {
		if (!this.processStatusPubSubService) {
			return;
		}

		const context =
			await this.getProcessNotificationContextByProcessId(processId);
		await this.processStatusPubSubService.publishProcessStatusEvent({
			...context,
			stage,
			status,
			durationMs,
			message,
			occurredAt: new Date().toISOString(),
		});
	}

	/**
	 * Counts processes stuck in `finalizing` longer than expected — a lost
	 * AMQP message (crash before the handler's catch, misrouted queue) is the
	 * only way this happens, given no retry/DLQ. Feeds a monitoring gauge
	 * rather than an automated fix, since there is deliberately no retry logic
	 * for this stage.
	 */
	async countStaleFinalizingProcesses(olderThanMs: number) {
		const cutoff = new Date(Date.now() - olderThanMs);
		const [result] = await this.db
			.select({ value: count() })
			.from(schema.process)
			.where(
				and(
					eq(schema.process.status, "finalizing"),
					lt(schema.process.updatedAt, cutoff),
				),
			);

		return Number(result?.value ?? 0);
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
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_FOUND,
				message: "Process not found",
			});
		}

		if (process.status !== "finalizing") {
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_COMPLETED,
				message: "Process is not completed yet",
			});
		}

		const processSourceFile = await this.db
			.select({
				sourceFileName: schema.file.filename,
			})
			.from(schema.process)
			.innerJoin(schema.file, eq(schema.process.sourceFileId, schema.file.id))
			.where(eq(schema.process.id, processId))
			.limit(1)
			.then((rows) => rows[0]);

		if (!processSourceFile) {
			throw new InternalError({
				code: APP_ERROR.PROCESS_SOURCE_FILE_NOT_FOUND,
				message: "Source file not found",
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
				throw new InternalError({
					code: APP_ERROR.PROCESS_OUTPUT_INCOMPLETE,
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
			filename: `${processSourceFile.sourceFileName.replace(/\.[^.]+$/, "")}.zip`,
			buffer: archive,
		};
	}

	async deleteProcess(processId: string, userId: string) {
		const process = await this.db.query.process.findFirst({
			where: (process, { and, eq }) =>
				and(eq(process.id, processId), eq(process.userId, userId)),
		});

		if (!process) {
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_FOUND,
				message: "Process not found",
			});
		}

		if (process.status !== "completed" && process.status !== "failed") {
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_DELETABLE,
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
			process.mergedMdFileId,
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

		await this.db
			.delete(schema.process)
			.where(
				and(
					eq(schema.process.id, processId),
					eq(schema.process.userId, userId),
				),
			);
		await this.filesService.deleteFiles(fileIds);
	}

	async cleanupExpiredProcesses() {
		const cutoff = new Date(
			Date.now() - ProcessService.RETENTION_DAYS * 24 * 60 * 60 * 1000,
		);
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
			);
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
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_FOUND,
				message: "Process not found",
			});
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
					const nativeMarkdownFileId = this.hasUsableNativeText(
						image.nativeText,
					)
						? await this.filesService.createPageMarkdownFile({
								pageId,
								pageNumber: image.pageNumber,
								content: image.nativeText ?? "",
								now,
							})
						: null;
					const [createdPage] = await this.db
						.insert(schema.page)
						.values({
							id: pageId,
							processId,
							pageNumber: image.pageNumber,
							imageFileId: image.imageFileId,
							markdownFileId: nativeMarkdownFileId,
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

	/**
	 * Moves a process from the per-page pipeline into the "finalizing" stage,
	 * then fans out to the two independent post-completion workers (zip,
	 * merged markdown). Guarded on the current status rather than pre-read: two
	 * near-simultaneous "last page done" observations from `syncProcessProgress`
	 * could otherwise both pass a plain check and both trigger the fan-out
	 * twice. Only the call whose UPDATE actually matches a row proceeds to
	 * notify and publish — the other is a silent no-op.
	 */
	async finalizeProcess(processId: string, completedPages: number) {
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({
				status: "finalizing",
				isRunning: false,
				completedPages,
				error: null,
				errorAt: null,
				updatedAt: now,
			})
			.where(
				and(
					eq(schema.process.id, processId),
					notInArray(schema.process.status, [
						"finalizing",
						"completed",
						"failed",
					]),
				),
			)
			.returning();

		if (!updatedProcess) {
			return updatedProcess;
		}

		await this.publishProcessStatusEvent({
			processId,
			stage: "process_finalizing",
			status: "success",
			durationMs: 0,
			message: "Process finalizing",
		});

		await this.buildZipPublisher?.publish({ processId });
		await this.mergeMarkdownPublisher?.publish({ processId });

		return updatedProcess;
	}

	/**
	 * Builds the per-page-markdown zip and persists it, then reports readiness
	 * via {@link markZipReady}. Called end-to-end from `build-zip-worker`'s
	 * handler so the worker never has to reach into `FilesService` directly.
	 */
	async finalizeZip(processId: string, userId: string) {
		const archive = await this.buildProcessMarkdownZip(processId, userId);
		const now = new Date();
		const zipFileId = await this.filesService.createProcessZipFile({
			processId,
			buffer: archive.buffer,
			filename: archive.filename,
			now,
		});

		return this.markZipReady(processId, zipFileId);
	}

	/**
	 * Concatenates every page's markdown into one file and persists it, then
	 * reports readiness via {@link markMergedMdReady}. Called end-to-end from
	 * `merge-markdown-worker`'s handler.
	 */
	async mergeProcessMarkdown(processId: string) {
		const process = await this.getProcessById(processId);
		if (!process) {
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_FOUND,
				message: "Process not found",
			});
		}

		if (process.status !== "finalizing") {
			throw new InternalError({
				code: APP_ERROR.PROCESS_NOT_COMPLETED,
				message: "Process is not completed yet",
			});
		}

		const processSourceFile = await this.db
			.select({
				sourceFileName: schema.file.filename,
			})
			.from(schema.process)
			.innerJoin(schema.file, eq(schema.process.sourceFileId, schema.file.id))
			.where(eq(schema.process.id, processId))
			.limit(1)
			.then((rows) => rows[0]);

		if (!processSourceFile) {
			throw new InternalError({
				code: APP_ERROR.PROCESS_SOURCE_FILE_NOT_FOUND,
				message: "Source file not found",
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

		const pageContents: string[] = [];
		for (const page of pages) {
			if (!page.markdownFileId) {
				throw new InternalError({
					code: APP_ERROR.PROCESS_OUTPUT_INCOMPLETE,
					message: "Process output is incomplete",
				});
			}

			pageContents.push(
				await this.filesService.getFileText(page.markdownFileId),
			);
		}

		const now = new Date();
		const mergedMdFileId = await this.filesService.createProcessMarkdownFile({
			processId,
			content: pageContents.join("\n\n"),
			filename: `${processSourceFile.sourceFileName.replace(/\.[^.]+$/, "")}.md`,
			now,
		});

		return this.markMergedMdReady(processId, mergedMdFileId);
	}

	/**
	 * Atomic, conditional completion of one of the two parallel finalization
	 * treatments. A single `UPDATE ... WHERE status = 'finalizing'` statement
	 * both writes this artifact's file id and resolves `status` in the same
	 * pass via a `CASE` on the *other* artifact's field — whichever of the two
	 * calls (this one or {@link markMergedMdReady}) runs second is guaranteed
	 * by Postgres to see the first one's already-committed write, so exactly
	 * one of them transitions the row to `completed`. The `CASE` branches are
	 * cast `::process_status` explicitly: Postgres resolves an all-string-
	 * literal `CASE` to `text` by default, which does not implicitly coerce to
	 * an enum column. The `WHERE status = 'finalizing'` guard also makes this a
	 * no-op if the process already moved to `failed`, so a late success can
	 * never overwrite a failure.
	 */
	async markZipReady(processId: string, zipFileId: string) {
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({
				zipFileId,
				status: sql`CASE WHEN ${schema.process.mergedMdFileId} IS NOT NULL THEN 'completed' ELSE 'finalizing' END::process_status`,
				completedAt: sql`CASE WHEN ${schema.process.mergedMdFileId} IS NOT NULL THEN ${now} ELSE ${schema.process.completedAt} END`,
				updatedAt: now,
			})
			.where(
				and(
					eq(schema.process.id, processId),
					eq(schema.process.status, "finalizing"),
				),
			)
			.returning();

		if (!updatedProcess) {
			getLoggerStore().info(
				{ processId },
				"markZipReady: process already resolved (completed or failed), skipping",
			);
			return updatedProcess;
		}

		if (updatedProcess.status === "completed") {
			await this.publishProcessStatusEvent({
				processId,
				stage: "process_completed",
				status: "success",
				durationMs: 0,
				message: "Process completed",
			});
		}

		return updatedProcess;
	}

	/** Mirrors {@link markZipReady} for the merged-markdown artifact. */
	async markMergedMdReady(processId: string, mergedMdFileId: string) {
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({
				mergedMdFileId,
				status: sql`CASE WHEN ${schema.process.zipFileId} IS NOT NULL THEN 'completed' ELSE 'finalizing' END::process_status`,
				completedAt: sql`CASE WHEN ${schema.process.zipFileId} IS NOT NULL THEN ${now} ELSE ${schema.process.completedAt} END`,
				updatedAt: now,
			})
			.where(
				and(
					eq(schema.process.id, processId),
					eq(schema.process.status, "finalizing"),
				),
			)
			.returning();

		if (!updatedProcess) {
			getLoggerStore().info(
				{ processId },
				"markMergedMdReady: process already resolved (completed or failed), skipping",
			);
			return updatedProcess;
		}

		if (updatedProcess.status === "completed") {
			await this.publishProcessStatusEvent({
				processId,
				stage: "process_completed",
				status: "success",
				durationMs: 0,
				message: "Process completed",
			});
		}

		return updatedProcess;
	}

	/**
	 * Symmetric with {@link markZipReady}/{@link markMergedMdReady}: guarded on
	 * `status = 'finalizing'` so whichever of (a worker failing) or (the other
	 * worker succeeding) lands first wins, and a late arrival from the other
	 * side can never overwrite it.
	 */
	async failFinalization(processId: string, error: string) {
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({
				status: "failed",
				isRunning: false,
				error,
				errorAt: now,
				completedAt: null,
				updatedAt: now,
			})
			.where(
				and(
					eq(schema.process.id, processId),
					eq(schema.process.status, "finalizing"),
				),
			)
			.returning();

		if (!updatedProcess) {
			getLoggerStore().info(
				{ processId },
				"failFinalization: process already resolved, skipping",
			);
			return updatedProcess;
		}

		await this.publishProcessStatusEvent({
			processId,
			stage: "process_failed",
			status: "failed",
			durationMs: 0,
			message: error,
		});

		return updatedProcess;
	}

	async failProcess(processId: string, error: string) {
		const previousProcess = await this.getProcessById(processId);
		const now = new Date();
		const [updatedProcess] = await this.db
			.update(schema.process)
			.set({
				status: "failed",
				isRunning: false,
				error,
				errorAt: now,
				completedAt: null,
				updatedAt: now,
			})
			.where(eq(schema.process.id, processId))
			.returning();

		if (
			previousProcess?.status !== "failed" ||
			previousProcess.error !== error
		) {
			await this.publishProcessStatusEvent({
				processId,
				stage: "process_failed",
				status: "failed",
				durationMs: 0,
				message: error,
			});
		}

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
