import { APP_ERROR } from "@ocr/common";
import { pinoLogger } from "@ocr/infra";
import { isInternalError } from "@ocr/infra/errors";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { parseContentDispositionFilename } from "../http/content-disposition";
import { container } from "../server/container";
import { withServerErrorLogging } from "../server/error-handling";
import { countOrphanedFileCleanup, countUpload } from "../server/metrics";
import { requireUser } from "../server/session";

const deleteProcessInput = z.object({
	processId: z.uuid(),
});

const uploadFileInput = zfd.formData({
	file: zfd.file(),
});

export const getProcessesByUserId = createServerFn({ method: "GET" }).handler(
	() =>
		withServerErrorLogging(
			"processes.getProcesses",
			async () => {
				const user = await requireUser();
				pinoLogger.info({ userId: user.id }, "Get processes for user");

				return container.processService.getProcessesByUserId(user.id);
			},
			{ userMessage: "Failed to load processes. Please try again." },
		),
);

export const deleteProcess = createServerFn({ method: "POST" })
	.inputValidator(deleteProcessInput)
	.handler(async ({ data }) => {
		await withServerErrorLogging(
			"processes.delete",
			async () => {
				const user = await requireUser();
				pinoLogger.info(
					{ userId: user.id, processId: data.processId },
					"Delete process",
				);

				await container.processService.deleteProcess(data.processId, user.id);
			},
			{ userMessage: "Failed to delete process. Please try again." },
		);

		return { success: true };
	});

export type UserProcess = Awaited<
	ReturnType<typeof getProcessesByUserId>
>[number];

export const processesQueryKey = ["processes", "list"] as const;

export const processesQueryOptions = () =>
	queryOptions({
		queryKey: processesQueryKey,
		queryFn: () => getProcessesByUserId(),
	});

/**
 * Compensates a failed process creation by removing the object that was
 * already pushed to S3. Never throws: the caller is on its way to rethrowing
 * the error that caused the compensation, and a cleanup failure must not
 * replace it — that would hide the real reason behind an S3 message. It is
 * reported through `ocr_web_orphaned_file_cleanups_total{result="failed"}`
 * instead, which is the only signal that the bucket now holds an orphan.
 */
const cleanUpOrphanedFile = async (fileId: string, userId: string) => {
	try {
		await container.filesService.deleteFiles([fileId]);
		countOrphanedFileCleanup("succeeded");
	} catch (error) {
		countOrphanedFileCleanup("failed");
		pinoLogger.error(
			{ err: error, fileId, userId },
			"Failed to remove the orphaned file of a failed process creation",
		);
	}
};

export const uploadProcessFile = createServerFn({ method: "POST" })
	.inputValidator(uploadFileInput)
	.handler(({ data }) =>
		withServerErrorLogging(
			"files.upload",
			async () => {
				const user = await requireUser();
				pinoLogger.info({ userId: user.id }, "Upload file");

				try {
					await container.processService.assertDailyProcessLimit(user.id);

					const file = await container.filesService.uploadFile(data.file);

					try {
						const process = await container.processService.createProcess({
							fileId: file.id,
							userId: user.id,
						});

						countUpload("accepted");

						return { process };
					} catch (error) {
						// Without this, a failed creation leaves an orphan in S3.
						await cleanUpOrphanedFile(file.id, user.id);
						throw error;
					}
				} catch (error) {
					countUpload(
						isInternalError(error) &&
							error.code === APP_ERROR.PROCESS_DAILY_LIMIT_REACHED
							? "rejected_daily_limit"
							: "failed",
					);
					throw error;
				}
			},
			{ userMessage: "Upload failed. Please try again." },
		),
	);

export const downloadProcessArchive = async (processId: string) => {
	const response = await fetch(`/downloads/processes/${processId}`, {
		method: "GET",
		credentials: "include",
	});

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			message?: string;
		} | null;
		throw new Error(payload?.message ?? "Download failed.");
	}

	const blob = await response.blob();
	const filename =
		parseContentDispositionFilename(
			response.headers.get("content-disposition"),
		) ?? `process-${processId}.zip`;

	return {
		blob,
		filename,
	};
};
