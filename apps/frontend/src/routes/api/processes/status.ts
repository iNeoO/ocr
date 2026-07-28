import type { ProcessStatusEvent } from "@ocr/common";
import { pinoLogger } from "@ocr/infra";
import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { container } from "../../../libs/server/container";
import { toServerError } from "../../../libs/server/errors";
import {
	countSseDroppedFrame,
	countSseFrame,
	type SseCloseReason,
	type SseFrameKind,
	trackSseStream,
} from "../../../libs/server/metrics";
import { requireUser } from "../../../libs/server/session";
import {
	encodeSseData,
	encodeSseKeepAlive,
	PROCESS_STATUS_STREAM,
	SSE_HEADERS,
	SSE_KEEP_ALIVE_INTERVAL_MS,
} from "../../../libs/server/sse";

export const Route = createFileRoute("/api/processes/status")({
	server: {
		handlers: {
			GET: async () => {
				let userId: string;

				try {
					userId = (await requireUser()).id;
				} catch (error) {
					// `requireUser` fails for two very different reasons: a missing or
					// expired session (401), and the session lookup itself blowing up
					// (Postgres or Redis down, 500). Same disclosure policy as
					// `withServerErrorLogging`: a 4xx message was deliberately shaped
					// for the user, anything else stays internal.
					const { statusCode, message } = toServerError(error);

					if (statusCode >= 500) {
						pinoLogger.error(
							{ err: error, statusCode },
							"Process status stream failed to resolve the session",
						);
						return Response.json(
							{ message: "Internal server error" },
							{ status: statusCode },
						);
					}

					pinoLogger.warn(
						{ err: error, statusCode },
						"Process status stream rejected",
					);
					return Response.json({ message }, { status: statusCode });
				}

				const encoder = new TextEncoder();
				let unsubscribe: (() => Promise<void>) | null = null;
				let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
				let closeStreamMetric: ((reason: SseCloseReason) => void) | null = null;
				let closed = false;

				const cleanup = async (reason: SseCloseReason) => {
					if (closed) {
						return;
					}
					closed = true;

					if (keepAliveTimer) {
						clearInterval(keepAliveTimer);
						keepAliveTimer = null;
					}

					closeStreamMetric?.(reason);
					closeStreamMetric = null;

					await unsubscribe?.();
					unsubscribe = null;
					pinoLogger.info({ userId, reason }, "Process status stream closed");
				};

				const stream = new ReadableStream<Uint8Array>({
					async start(controller) {
						const enqueue = (frame: string, kind: SseFrameKind) => {
							if (closed) {
								return;
							}
							try {
								controller.enqueue(encoder.encode(frame));
								countSseFrame(PROCESS_STATUS_STREAM, kind);
							} catch (error) {
								// Invisible without this counter: the frame is lost, the
								// client silently stops receiving updates, and the only
								// trace is a debug log.
								countSseDroppedFrame(PROCESS_STATUS_STREAM);
								pinoLogger.debug(
									{ err: error, userId },
									"Dropped SSE frame on a closed stream",
								);
								void cleanup("write_failed");
							}
						};

						closeStreamMetric = trackSseStream(PROCESS_STATUS_STREAM);

						unsubscribe =
							await container.processStatusPubSubService.subscribeToUserProcessStatus(
								userId,
								(event: ProcessStatusEvent) =>
									enqueue(encodeSseData(event), "event"),
							);

						keepAliveTimer = setInterval(
							() => enqueue(encodeSseKeepAlive(), "keep_alive"),
							SSE_KEEP_ALIVE_INTERVAL_MS,
						);

						getRequest().signal.addEventListener("abort", () => {
							void cleanup("client_abort");
						});

						pinoLogger.info({ userId }, "Process status stream opened");
					},
					cancel: () => cleanup("stream_cancelled"),
				});

				return new Response(stream, { status: 200, headers: SSE_HEADERS });
			},
		},
	},
});
