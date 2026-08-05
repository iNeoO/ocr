import {
	Counter,
	collectDefaultMetrics,
	Gauge,
	Histogram,
	Registry,
} from "prom-client";

const METRIC_PREFIX = "ocr_web_";

/**
 * Route label values, kept to a fixed set on purpose.
 *
 * `route` is a Prometheus label, so every distinct value is a new time series.
 * The raw pathname is unbounded — process ids, hashed asset names, crawler
 * noise — so anything that is not a route this app actually serves collapses
 * into `other`. Add an entry here when a route file is added; the metric
 * silently degrades to `other` if you forget, it never explodes.
 */
const KNOWN_ROUTES = new Set([
	"/",
	"/api/processes/status",
	"/downloads/processes/:id",
	"/login",
	"/metrics",
	"/password-forgotten",
	"/processes",
	"/reset-password",
	"/sign-up",
	"/terms-and-conditions",
	"/validate-email",
]);

const UUID_SEGMENT =
	/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi;

/**
 * Every server function call lands on the same generated endpoint with the
 * function id in the query string. They are counted per operation by
 * {@link observeServerFn}, so the HTTP view only needs the aggregate.
 */
const SERVER_FN_ROUTE = "/_serverFn";

export const normalizeRoute = (pathname: string) => {
	if (pathname.startsWith("/_serverFn")) {
		return SERVER_FN_ROUTE;
	}

	if (pathname.startsWith("/assets/") || pathname.startsWith("/@")) {
		return "static";
	}

	const template = pathname.replace(UUID_SEGMENT, "/:id");

	return KNOWN_ROUTES.has(template) ? template : "other";
};

export const getStatusClass = (statusCode: number) =>
	`${Math.floor(Math.max(statusCode, 0) / 100)}xx`;

const createMetrics = () => {
	const registry = new Registry();

	// Event loop lag, GC pauses, heap and handle counts. These matter here in a
	// way they did not on the JSON-only tRPC backend: this process renders React
	// server-side, so a blocked event loop shows up as slow documents.
	collectDefaultMetrics({ register: registry, prefix: METRIC_PREFIX });

	const httpRequestDurationSeconds = new Histogram({
		name: `${METRIC_PREFIX}http_request_duration_seconds`,
		help: "HTTP request duration in seconds, measured until the response is returned.",
		registers: [registry],
		labelNames: ["route", "method", "status_class"] as const,
		buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
	});

	const serverFnRequestsTotal = new Counter({
		name: `${METRIC_PREFIX}server_fn_requests_total`,
		help: "Total number of server function invocations.",
		registers: [registry],
		labelNames: ["operation", "result", "status_class"] as const,
	});

	const serverFnDurationSeconds = new Histogram({
		name: `${METRIC_PREFIX}server_fn_duration_seconds`,
		help: "Server function handler duration in seconds.",
		registers: [registry],
		labelNames: ["operation", "status_class"] as const,
		buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
	});

	const sseStreamsActive = new Gauge({
		name: `${METRIC_PREFIX}sse_streams_active`,
		help: "Number of currently open server-sent event streams.",
		registers: [registry],
		labelNames: ["stream"] as const,
	});

	const sseStreamsOpenedTotal = new Counter({
		name: `${METRIC_PREFIX}sse_streams_opened_total`,
		help: "Total number of server-sent event streams opened.",
		registers: [registry],
		labelNames: ["stream"] as const,
	});

	const sseStreamsClosedTotal = new Counter({
		name: `${METRIC_PREFIX}sse_streams_closed_total`,
		help: "Total number of server-sent event streams closed, by reason.",
		registers: [registry],
		labelNames: ["stream", "reason"] as const,
	});

	const sseFramesTotal = new Counter({
		name: `${METRIC_PREFIX}sse_frames_total`,
		help: "Total number of frames written to server-sent event streams.",
		registers: [registry],
		labelNames: ["stream", "kind"] as const,
	});

	const sseFramesDroppedTotal = new Counter({
		name: `${METRIC_PREFIX}sse_frames_dropped_total`,
		help: "Total number of frames dropped because the stream was already closed.",
		registers: [registry],
		labelNames: ["stream"] as const,
	});

	const downloadsTotal = new Counter({
		name: `${METRIC_PREFIX}downloads_total`,
		help: "Total number of process archive downloads, by outcome.",
		registers: [registry],
		labelNames: ["result"] as const,
	});

	const downloadArchiveBytes = new Histogram({
		name: `${METRIC_PREFIX}download_archive_bytes`,
		help: "Size of served process archives in bytes. The whole archive is buffered in memory, so this bounds the per-request footprint.",
		registers: [registry],
		buckets: [
			64_000, 256_000, 1_000_000, 4_000_000, 16_000_000, 64_000_000,
			256_000_000,
		],
	});

	const uploadsTotal = new Counter({
		name: `${METRIC_PREFIX}uploads_total`,
		help: "Total number of process upload attempts, by outcome.",
		registers: [registry],
		labelNames: ["result"] as const,
	});

	const orphanedFileCleanupsTotal = new Counter({
		name: `${METRIC_PREFIX}orphaned_file_cleanups_total`,
		help: "Compensating S3 deletes run after a failed process creation. A `failed` here means an object is orphaned in the bucket.",
		registers: [registry],
		labelNames: ["result"] as const,
	});

	return {
		registry,
		httpRequestDurationSeconds,
		serverFnRequestsTotal,
		serverFnDurationSeconds,
		sseStreamsActive,
		sseStreamsOpenedTotal,
		sseStreamsClosedTotal,
		sseFramesTotal,
		sseFramesDroppedTotal,
		downloadsTotal,
		downloadArchiveBytes,
		uploadsTotal,
		orphanedFileCleanupsTotal,
	};
};

type ServerMetrics = ReturnType<typeof createMetrics>;

/**
 * Same reasoning as the server container: `vite dev` re-evaluates this module
 * on every hot reload, and prom-client throws when a metric name is registered
 * twice. Pinning the registry to `globalThis` keeps one set of collectors per
 * process, so a reload neither crashes the server nor resets the counters.
 */
const METRICS_GLOBAL_KEY = "__ocrServerMetrics__";

type MetricsGlobal = typeof globalThis & {
	[METRICS_GLOBAL_KEY]?: ServerMetrics;
};

const globalRef = globalThis as MetricsGlobal;

globalRef[METRICS_GLOBAL_KEY] ??= createMetrics();

const metrics: ServerMetrics = globalRef[METRICS_GLOBAL_KEY];

export const renderMetrics = () => metrics.registry.metrics();

export const metricsContentType = metrics.registry.contentType;

export const observeHttpRequest = ({
	pathname,
	method,
	statusCode,
	durationMs,
}: {
	pathname: string;
	method: string;
	statusCode: number;
	durationMs: number;
}) => {
	metrics.httpRequestDurationSeconds
		.labels(normalizeRoute(pathname), method, getStatusClass(statusCode))
		.observe(durationMs / 1000);
};

export const observeServerFn = ({
	operation,
	statusCode,
	durationMs,
	result,
}: {
	operation: string;
	statusCode: number;
	durationMs: number;
	result: "success" | "error";
}) => {
	const statusClass = getStatusClass(statusCode);

	metrics.serverFnRequestsTotal.labels(operation, result, statusClass).inc();
	metrics.serverFnDurationSeconds
		.labels(operation, statusClass)
		.observe(durationMs / 1000);
};

export type SseCloseReason =
	| "client_abort"
	| "stream_cancelled"
	| "write_failed";

export type SseFrameKind = "event" | "keep_alive";

/**
 * Replaces the `trpc_active_subscriptions` gauge the tRPC backend exposed: the
 * process status subscription is now a plain SSE stream. Returns the closer so
 * the gauge can never drift — increment and decrement stay in one place.
 */
export const trackSseStream = (stream: string) => {
	metrics.sseStreamsActive.labels(stream).inc();
	metrics.sseStreamsOpenedTotal.labels(stream).inc();

	return (reason: SseCloseReason) => {
		metrics.sseStreamsActive.labels(stream).dec();
		metrics.sseStreamsClosedTotal.labels(stream, reason).inc();
	};
};

export const countSseFrame = (stream: string, kind: SseFrameKind) => {
	metrics.sseFramesTotal.labels(stream, kind).inc();
};

export const countSseDroppedFrame = (stream: string) => {
	metrics.sseFramesDroppedTotal.labels(stream).inc();
};

export const countDownload = (result: "success" | "rejected" | "failed") => {
	metrics.downloadsTotal.labels(result).inc();
};

export const observeDownloadArchiveSize = (bytes: number) => {
	metrics.downloadArchiveBytes.observe(bytes);
};

export const countUpload = (
	result: "accepted" | "rejected_daily_limit" | "failed",
) => {
	metrics.uploadsTotal.labels(result).inc();
};

export const countOrphanedFileCleanup = (result: "succeeded" | "failed") => {
	metrics.orphanedFileCleanupsTotal.labels(result).inc();
};
