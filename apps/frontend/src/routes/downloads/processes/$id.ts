import { isAPIError } from "@ocr/common";
import { pinoLogger } from "@ocr/infra";
import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "../../../libs/api/auth";
import { downloadServices } from "../../../libs/server/download-services";

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
						return Response.json({ message: "Unauthorized" }, { status: 401 });
					}

					const archive =
						await downloadServices.processService.buildProcessMarkdownZip(
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

					const body = new Blob([new Uint8Array(archive.buffer)], {
						type: "application/zip",
					});

					return new Response(body, {
						status: 200,
						headers: {
							"Content-Type": "application/zip",
							"Content-Disposition": `attachment; filename="${archive.filename}"`,
							"Content-Length": String(archive.buffer.length),
							"Cache-Control": "no-store",
						},
					});
				} catch (error) {
					if (isAPIError(error)) {
						pinoLogger.warn(
							{
								err: error,
								processId: params.id,
								statusCode: error.statusCode,
							},
							"Process download rejected",
						);
						return Response.json(
							{ message: error.message },
							{ status: error.statusCode },
						);
					}

					pinoLogger.error(
						{ err: error, processId: params.id },
						"Process download failed",
					);
					return Response.json(
						{ message: "Internal server error" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
