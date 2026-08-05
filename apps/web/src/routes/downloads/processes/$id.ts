import { pinoLogger } from "@ocr/infra";
import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "../../../libs/api/auth";
import { buildContentDispositionAttachment } from "../../../libs/http/content-disposition";
import { container } from "../../../libs/server/container";
import { toServerError } from "../../../libs/server/errors";
import {
	countDownload,
	observeDownloadArchiveSize,
} from "../../../libs/server/metrics";

export const Route = createFileRoute("/downloads/processes/$id")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				try {
					pinoLogger.info(
						{ processId: params.id },
						"Starting process download",
					);
					const session = await getSession();

					if (!session?.user?.id) {
						countDownload("rejected");
						return Response.json({ message: "Unauthorized" }, { status: 401 });
					}

					const archive =
						await container.processService.buildProcessMarkdownZip(
							params.id,
							session.user.id,
						);

					pinoLogger.info(
						{
							processId: params.id,
							userId: session.user.id,
							size: archive.buffer.length,
						},
						"Process download ready",
					);

					countDownload("success");
					observeDownloadArchiveSize(archive.buffer.length);

					const body = new Blob([new Uint8Array(archive.buffer)], {
						type: "application/zip",
					});

					return new Response(body, {
						status: 200,
						headers: {
							"Content-Type": "application/zip",
							"Content-Disposition": buildContentDispositionAttachment(
								archive.filename,
							),
							"Content-Length": String(archive.buffer.length),
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
							"Process download failed",
						);
						return Response.json(
							{ message: "Internal server error" },
							{ status: 500 },
						);
					}

					countDownload("rejected");
					pinoLogger.warn(
						{ err: error, processId: params.id, statusCode },
						"Process download rejected",
					);
					return Response.json({ message }, { status: statusCode });
				}
			},
		},
	},
});
