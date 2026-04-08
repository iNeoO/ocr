import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { type Database, schema } from "@ocr/db";
import { getLoggerStore } from "@ocr/infra";
import { s3, s3Config } from "@ocr/infra/s3";
import { PDFParse } from "pdf-parse";
import { fileToNodeStream } from "./files.helpers.js";

export class FilesService {
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

	async splitFileIntoPages(fileId: string) {
		const file = await this.getFileById(fileId);
		if (!file) {
			throw new Error("File not found");
		}

		const objectKey = `files/${file.id}/${file.filename}`;

		const response = await s3.send(
			new GetObjectCommand({
				Bucket: s3Config.bucket,
				Key: objectKey,
			}),
		);

		if (!response.Body) {
			throw new Error("File content not found in S3");
		}

		const bytes = await response.Body.transformToByteArray();
		const parser = new PDFParse({ data: bytes });
		let isCleanedUp = false;
		try {
			const result = await parser.getScreenshot();
			await parser.destroy();
			isCleanedUp = true;

			await Promise.all(
				result.pages.map(async (page) => {
					const pageId = randomUUID();
					const pageObjectKey = `files/${file.id}/pages/${pageId}.png`;
					const now = new Date();

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
				}),
			);
		} catch (error) {
			const logger = getLoggerStore();
			logger.error({ err: error }, "Error splitting PDF into pages");
			if (!isCleanedUp) {
				await parser.destroy();
				throw new Error("File error during PDF parsing and cleanup");
			}
			throw new Error("File error during PDF upload");
		}
	}
}
