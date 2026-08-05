import { randomUUID } from "node:crypto";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { APP_ERROR } from "@ocr/common";
import { type Database, schema } from "@ocr/db";
import { getLoggerStore, InternalError } from "@ocr/infra";
import { s3, s3Config } from "@ocr/infra/s3";
import { eq, inArray } from "drizzle-orm";
import { PDFParse } from "pdf-parse";
import { fileToNodeStream } from "./files.helpers.js";
import type { SplitPageImage } from "./files.type.js";

export class FilesService {
	private static readonly PAGE_SCREENSHOT_SCALE = 4;

	private readonly db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	async uploadFile(uploadedFile: File) {
		const now = new Date();
		const id = randomUUID();
		const objectKey = `files/${id}/${uploadedFile.name}`;
		const body = fileToNodeStream(uploadedFile);

		await s3.send(
			new PutObjectCommand({
				Bucket: s3Config.bucket,
				Key: objectKey,
				Body: body,
				ContentLength: uploadedFile.size,
				ContentType: uploadedFile.type,
			}),
		);

		const [createdFile] = await this.db
			.insert(schema.file)
			.values({
				id,
				kind: "source_pdf",
				bucket: s3Config.bucket,
				objectKey,
				mimeType: uploadedFile.type,
				size: uploadedFile.size,
				filename: uploadedFile.name,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		return createdFile;
	}

	async getFileById(id: string) {
		const file = await this.db.query.file.findFirst({
			where: (file, { eq }) => eq(file.id, id),
		});
		return file;
	}

	async getFileBuffer(fileId: string) {
		const file = await this.getFileById(fileId);
		if (!file) {
			throw new InternalError({
				code: APP_ERROR.FILE_NOT_FOUND,
				message: "File not found",
			});
		}

		const response = await s3.send(
			new GetObjectCommand({
				Bucket: file.bucket,
				Key: file.objectKey,
			}),
		);

		if (!response.Body) {
			throw new InternalError({
				code: APP_ERROR.FILE_CONTENT_NOT_FOUND,
				message: "File content not found in S3",
			});
		}

		return response.Body.transformToByteArray();
	}

	async getFileText(fileId: string) {
		const buffer = await this.getFileBuffer(fileId);
		return Buffer.from(buffer).toString("utf-8");
	}

	async replaceFileContent(fileId: string, content: string | Uint8Array) {
		const file = await this.getFileById(fileId);
		if (!file) {
			throw new InternalError({
				code: APP_ERROR.FILE_NOT_FOUND,
				message: "File not found",
			});
		}

		const body =
			typeof content === "string"
				? Buffer.from(content, "utf-8")
				: Buffer.from(content);
		const now = new Date();

		await s3.send(
			new PutObjectCommand({
				Bucket: file.bucket,
				Key: file.objectKey,
				Body: body,
				ContentLength: body.length,
				ContentType: file.mimeType,
			}),
		);

		const [updatedFile] = await this.db
			.update(schema.file)
			.set({
				size: body.length,
				updatedAt: now,
			})
			.where(eq(schema.file.id, fileId))
			.returning();

		return updatedFile;
	}

	async createPageMarkdownFile({
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
		const markdownFileId = randomUUID();
		const filename = `page-${pageNumber}.md`;
		const objectKey = `pages/${pageId}/${markdownFileId}.md`;
		const body = Buffer.from(content, "utf-8");

		await s3.send(
			new PutObjectCommand({
				Bucket: s3Config.bucket,
				Key: objectKey,
				Body: body,
				ContentLength: body.length,
				ContentType: "text/markdown; charset=utf-8",
			}),
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

		return markdownFileId;
	}

	async createProcessZipFile({
		processId,
		buffer,
		filename,
		now,
	}: {
		processId: string;
		buffer: Buffer;
		filename: string;
		now: Date;
	}) {
		const zipFileId = randomUUID();
		const objectKey = `processes/${processId}/${zipFileId}.zip`;

		await s3.send(
			new PutObjectCommand({
				Bucket: s3Config.bucket,
				Key: objectKey,
				Body: buffer,
				ContentLength: buffer.length,
				ContentType: "application/zip",
			}),
		);

		await this.db.insert(schema.file).values({
			id: zipFileId,
			kind: "zip",
			bucket: s3Config.bucket,
			objectKey,
			mimeType: "application/zip",
			size: buffer.length,
			filename,
			createdAt: now,
			updatedAt: now,
		});

		return zipFileId;
	}

	async createProcessMarkdownFile({
		processId,
		content,
		filename,
		now,
	}: {
		processId: string;
		content: string;
		filename: string;
		now: Date;
	}) {
		const mergedMdFileId = randomUUID();
		const objectKey = `processes/${processId}/${mergedMdFileId}.md`;
		const body = Buffer.from(content, "utf-8");

		await s3.send(
			new PutObjectCommand({
				Bucket: s3Config.bucket,
				Key: objectKey,
				Body: body,
				ContentLength: body.length,
				ContentType: "text/markdown; charset=utf-8",
			}),
		);

		await this.db.insert(schema.file).values({
			id: mergedMdFileId,
			kind: "process_markdown",
			bucket: s3Config.bucket,
			objectKey,
			mimeType: "text/markdown",
			size: body.length,
			filename,
			createdAt: now,
			updatedAt: now,
		});

		return mergedMdFileId;
	}

	async deleteFiles(fileIds: string[]) {
		const uniqueFileIds = [...new Set(fileIds.filter(Boolean))];
		if (uniqueFileIds.length === 0) {
			return;
		}

		const files = await this.db
			.select({
				id: schema.file.id,
				bucket: schema.file.bucket,
				objectKey: schema.file.objectKey,
			})
			.from(schema.file)
			.where(inArray(schema.file.id, uniqueFileIds));

		for (const file of files) {
			await s3.send(
				new DeleteObjectCommand({
					Bucket: file.bucket,
					Key: file.objectKey,
				}),
			);
		}

		await this.db
			.delete(schema.file)
			.where(inArray(schema.file.id, uniqueFileIds));
	}

	async splitFileIntoPages(fileId: string) {
		const file = await this.getFileById(fileId);
		if (!file) {
			throw new InternalError({
				code: APP_ERROR.FILE_NOT_FOUND,
				message: "File not found",
			});
		}

		const response = await s3.send(
			new GetObjectCommand({
				Bucket: s3Config.bucket,
				Key: file.objectKey,
			}),
		);

		if (!response.Body) {
			throw new InternalError({
				code: APP_ERROR.FILE_CONTENT_NOT_FOUND,
				message: "File content not found in S3",
			});
		}

		const bytes = await response.Body.transformToByteArray();
		const parser = new PDFParse({ data: bytes });
		let isCleanedUp = false;
		try {
			const screenshotResult = await parser.getScreenshot({
				scale: FilesService.PAGE_SCREENSHOT_SCALE,
			});
			const textResult = await parser.getText();
			await parser.destroy();
			isCleanedUp = true;

			const createdPages = await Promise.all(
				screenshotResult.pages.map(async (page, index) => {
					const pageId = randomUUID();
					const pageObjectKey = `files/${file.id}/pages/${pageId}.png`;
					const now = new Date();
					const nativeText = textResult.pages
						.find((textPage) => textPage.num === index + 1)
						?.text.trim();

					await s3.send(
						new PutObjectCommand({
							Bucket: s3Config.bucket,
							Key: pageObjectKey,
							Body: page.data,
							ContentType: "image/png",
						}),
					);

					await this.db.insert(schema.file).values({
						id: pageId,
						kind: "page_image",
						bucket: s3Config.bucket,
						objectKey: pageObjectKey,
						mimeType: "image/png",
						size: page.data.length,
						filename: `${pageId}.png`,
						createdAt: now,
						updatedAt: now,
					});

					return {
						pageNumber: index + 1,
						imageFileId: pageId,
						...(nativeText ? { nativeText } : {}),
					} satisfies SplitPageImage;
				}),
			);

			return createdPages;
		} catch (error) {
			const logger = getLoggerStore();
			logger.error({ err: error }, "Error splitting PDF into pages");
			if (!isCleanedUp) {
				await parser.destroy();
				throw new InternalError({
					code: APP_ERROR.FILE_PDF_SPLIT_FAILED,
					message: "File error during PDF parsing and cleanup",
					cause: error,
				});
			}
			throw new InternalError({
				code: APP_ERROR.FILE_PDF_SPLIT_FAILED,
				message: "File error during PDF upload",
				cause: error,
			});
		}
	}
}
