import { APP_ERROR } from "@ocr/common";
import { InternalError, pinoLogger } from "@ocr/infra";
import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "../../../../libs/api/auth";
import { buildContentDispositionAttachment } from "../../../../libs/http/content-disposition";
import { container } from "../../../../libs/server/container";
import { toServerError } from "../../../../libs/server/errors";
import {
	countDownload,
	observeDownloadArchiveSize,
} from "../../../../libs/server/metrics";

export const Route = createFileRoute("/downloads/processes/$id/markdown")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				try {
					pinoLogger.info(
						{ processId: params.id },
						"Starting process markdown download",
					);
					const session = await getSession();

					if (!session?.user?.id) {
						countDownload("rejected");
						return Response.json({ message: "Unauthorized" }, { status: 401 });
					}

					const process = await container.processService.getProcessForUser(
						params.id,
						session.user.id,
					);

					if (!process.mergedMdFileId) {
						throw new InternalError({
							code: APP_ERROR.PROCESS_OUTPUT_INCOMPLETE,
							message: "Process output is incomplete",
						});
					}

					const [file, buffer] = await Promise.all([
						container.filesService.getFileById(process.mergedMdFileId),
						container.filesService.getFileBuffer(process.mergedMdFileId),
					]);

					if (!file) {
						throw new InternalError({
							code: APP_ERROR.FILE_NOT_FOUND,
							message: "File not found",
						});
					}

					pinoLogger.info(
						{
							processId: params.id,
							userId: session.user.id,
							size: buffer.length,
						},
						"Process markdown download ready",
					);

					countDownload("success");
					observeDownloadArchiveSize(buffer.length);

					const body = new Blob([new Uint8Array(buffer)], {
						type: "text/markdown; charset=utf-8",
					});

					return new Response(body, {
						status: 200,
						headers: {
							"Content-Type": "text/markdown; charset=utf-8",
							"Content-Disposition": buildContentDispositionAttachment(
								file.filename,
							),
							"Content-Length": String(buffer.length),
							"Cache-Control": "no-store",
						},
					});
				} catch (error) {
					// This handler does not go through a server function, so it
					// replicates the disclosure policy of `withServerErrorLogging` by
					// hand: a 4xx message was deliberately written for the user,
					// anything else becomes a generic 500.
					const { statusCode, message } = toServerError(error);

					if (statusCode >= 500) {
						countDownload("failed");
						pinoLogger.error(
							{ err: error, processId: params.id },
							"Process markdown download failed",
						);
						return Response.json(
							{ message: "Internal server error" },
							{ status: 500 },
						);
					}

					countDownload("rejected");
					pinoLogger.warn(
						{ err: error, processId: params.id, statusCode },
						"Process markdown download rejected",
					);
					return Response.json({ message }, { status: statusCode });
				}
			},
		},
	},
});
