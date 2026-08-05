import { pinoLogger } from "@ocr/infra";
import { ensureBucketExists } from "@ocr/infra/s3";
import type { Register } from "@tanstack/react-router";
import type { RequestHandler } from "@tanstack/react-start/server";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { observeHttpRequest } from "./libs/server/metrics";

// Fail-fast: nothing this server does is useful without the S3 bucket, so the
// check runs at module scope. Throwing here fails the evaluation of the server
// entry, and Node caches that failure — every request gets a 500 until the
// process is restarted. Deliberate: an unreachable bucket is an operator
// problem, not something to paper over per-request.
try {
	await ensureBucketExists();
} catch (error) {
	pinoLogger.fatal(
		{ err: error },
		"S3 bucket unavailable, refusing to serve requests",
	);
	throw error;
}

export type ServerEntry = { fetch: RequestHandler<Register> };

const startHandler = createStartHandler(defaultStreamHandler);

/**
 * Wire-level view of every request the Start server answers: SSR documents,
 * server function calls, route handlers and assets alike. This is the
 * replacement for the `http_request_duration_seconds` histogram the tRPC
 * backend exposed, and it is the only place that sees SSR render latency.
 *
 * For `/api/processes/status` the duration is time-to-response, not the
 * lifetime of the stream — the handler returns as soon as the SSE body is
 * wired up. Stream lifetime is tracked by `ocr_web_sse_streams_active`.
 */
const fetch: ServerEntry["fetch"] = async (request, opts) => {
	const startedAt = performance.now();
	const { pathname } = new URL(request.url);

	try {
		const response = await startHandler(request, opts);

		observeHttpRequest({
			pathname,
			method: request.method,
			statusCode: response.status,
			durationMs: performance.now() - startedAt,
		});

		return response;
	} catch (error) {
		// A throw here never reached a route handler, so nothing else will
		// record it. Count it as a 500 so the error rate stays honest.
		observeHttpRequest({
			pathname,
			method: request.method,
			statusCode: 500,
			durationMs: performance.now() - startedAt,
		});

		throw error;
	}
};

export default { fetch } satisfies ServerEntry;
