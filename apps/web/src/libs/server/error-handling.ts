import { pinoLogger } from "@ocr/infra";
import { createClientSafeError, toServerError } from "./errors";
import { observeServerFn } from "./metrics";

const DEFAULT_USER_MESSAGE = "Operation failed. Please try again.";

/**
 * Wraps every server function: logs failures, and — because it is the one
 * place that knows an operation's name, outcome and status code — records the
 * per-operation metrics that replaced the tRPC middleware's
 * `trpc_requests_total` / `trpc_request_duration_seconds`.
 *
 * The timing covers the handler body only, not request parsing or response
 * serialization; `ocr_web_http_request_duration_seconds{route="/_serverFn"}`
 * covers the wire-level view.
 */
export async function withServerErrorLogging<T>(
	operation: string,
	handler: () => Promise<T>,
	options?: {
		userMessage?: string;
	},
) {
	const startedAt = performance.now();

	try {
		const result = await handler();

		observeServerFn({
			operation,
			statusCode: 200,
			durationMs: performance.now() - startedAt,
			result: "success",
		});

		return result;
	} catch (error) {
		const serverError = toServerError(error);
		const logger = pinoLogger.child({ op: operation });

		observeServerFn({
			operation,
			statusCode: serverError.statusCode,
			durationMs: performance.now() - startedAt,
			result: "error",
		});

		// A 4xx status only exists because something deliberately shaped the
		// error as an API error (better-auth, our own domain errors), and those
		// messages are written to be read by the user. Everything else — a
		// Drizzle, S3 or AMQP failure — lands on the 500 default with an
		// internal message, so it never reaches the browser.
		if (serverError.statusCode >= 500) {
			logger.error({ err: error }, "Server operation failed");

			throw createClientSafeError(
				options?.userMessage ?? DEFAULT_USER_MESSAGE,
				serverError.statusCode,
			);
		}

		logger.warn(
			{ err: error, statusCode: serverError.statusCode },
			"Server operation rejected",
		);

		throw createClientSafeError(serverError.message, serverError.statusCode);
	}
}
