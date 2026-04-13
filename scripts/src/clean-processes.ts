import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db, schema } from "@ocr/db";
import { s3 } from "@ocr/infra/s3";
import { inArray } from "drizzle-orm";

type ManagedFile = {
	id: string;
	bucket: string;
	objectKey: string;
	filename: string;
	kind: (typeof schema.file.$inferSelect)["kind"];
};

const hasFlag = (flag: string) => process.argv.includes(flag);

const uniqueDefined = (values: Array<string | null>) =>
	[...new Set(values.filter((value): value is string => Boolean(value)))];

async function loadManagedFiles() {
	const processes = await db
		.select({
			id: schema.process.id,
			sourceFileId: schema.process.sourceFileId,
			zipFileId: schema.process.zipFileId,
		})
		.from(schema.process);

	if (processes.length === 0) {
		return {
			processes,
			pages: [] as Array<{ imageFileId: string | null; markdownFileId: string | null }>,
			files: [] as ManagedFile[],
		};
	}

	const processIds = processes.map((process) => process.id);
	const pages = await db
		.select({
			imageFileId: schema.page.imageFileId,
			markdownFileId: schema.page.markdownFileId,
		})
		.from(schema.page)
		.where(inArray(schema.page.processId, processIds));

	const fileIds = uniqueDefined([
		...processes.flatMap((process) => [process.sourceFileId, process.zipFileId]),
		...pages.flatMap((page) => [page.imageFileId, page.markdownFileId]),
	]);

	const files =
		fileIds.length === 0
			? []
			: await db
					.select({
						id: schema.file.id,
						bucket: schema.file.bucket,
						objectKey: schema.file.objectKey,
						filename: schema.file.filename,
						kind: schema.file.kind,
					})
					.from(schema.file)
					.where(inArray(schema.file.id, fileIds));

	return { processes, pages, files };
}

async function main() {
	const isDryRun = hasFlag("--dry-run");
	const { processes, pages, files } = await loadManagedFiles();

	console.log(
		JSON.stringify(
			{
				dryRun: isDryRun,
				processCount: processes.length,
				pageCount: pages.length,
				fileCount: files.length,
			},
			null,
			2,
		),
	);

	if (processes.length === 0) {
		console.log("No processes to clean.");
		return;
	}

	if (isDryRun) {
		console.log("Dry run only. No data was deleted.");
		return;
	}

	await db.delete(schema.process);

	const deletedFileIds: string[] = [];
	const failedFiles: Array<{ file: ManagedFile; error: unknown }> = [];

	for (const file of files) {
		try {
			await s3.send(
				new DeleteObjectCommand({
					Bucket: file.bucket,
					Key: file.objectKey,
				}),
			);
			deletedFileIds.push(file.id);
		} catch (error) {
			failedFiles.push({ file, error });
		}
	}

	if (deletedFileIds.length > 0) {
		await db
			.delete(schema.file)
			.where(inArray(schema.file.id, deletedFileIds));
	}

	console.log(
		JSON.stringify(
			{
				deletedProcessCount: processes.length,
				deletedPageCount: pages.length,
				deletedFileCount: deletedFileIds.length,
				failedFileCount: failedFiles.length,
			},
			null,
			2,
		),
	);

	if (failedFiles.length > 0) {
		console.error(
			"Some file objects could not be deleted from S3/MinIO. Their DB rows were kept.",
		);
		for (const failedFile of failedFiles) {
			console.error(
				JSON.stringify(
					{
						fileId: failedFile.file.id,
						filename: failedFile.file.filename,
						objectKey: failedFile.file.objectKey,
						error:
							failedFile.error instanceof Error
								? failedFile.error.message
								: String(failedFile.error),
					},
					null,
					2,
				),
			);
		}

		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
