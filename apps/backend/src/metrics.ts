import {
	Counter,
	collectDefaultMetrics,
	Gauge,
	Histogram,
	Registry,
} from "prom-client";

const METRIC_PREFIX = "ocr_backend_";

export const metricsRegistry = new Registry();

collectDefaultMetrics({
	register: metricsRegistry,
	prefix: METRIC_PREFIX,
});

const httpRequestDurationSeconds = new Histogram({
	name: `${METRIC_PREFIX}http_request_duration_seconds`,
	help: "HTTP request duration in seconds",
	registers: [metricsRegistry],
	labelNames: ["route", "method", "status_class"] as const,
	buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const trpcRequestsTotal = new Counter({
	name: `${METRIC_PREFIX}trpc_requests_total`,
	help: "Total number of tRPC requests",
	registers: [metricsRegistry],
	labelNames: ["procedure", "type", "result", "status_class"] as const,
});

const trpcRequestDurationSeconds = new Histogram({
	name: `${METRIC_PREFIX}trpc_request_duration_seconds`,
	help: "tRPC request duration in seconds",
	registers: [metricsRegistry],
	labelNames: ["procedure", "type", "status_class"] as const,
	buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
});

const trpcActiveSubscriptions = new Gauge({
	name: `${METRIC_PREFIX}trpc_active_subscriptions`,
	help: "Number of active tRPC subscriptions",
	registers: [metricsRegistry],
	labelNames: ["procedure"] as const,
});

const getStatusClass = (statusCode: number) =>
	`${Math.floor(Math.max(statusCode, 0) / 100)}xx`;

export const observeHttpRequest = ({
	route,
	method,
	statusCode,
	durationMs,
}: {
	route: string;
	method: string;
	statusCode: number;
	durationMs: number;
}) => {
	httpRequestDurationSeconds
		.labels(route, method, getStatusClass(statusCode))
		.observe(durationMs / 1000);
};

export const observeTrpcRequest = ({
	procedure,
	type,
	statusCode,
	durationMs,
	result,
}: {
	procedure: string;
	type: string;
	statusCode: number;
	durationMs: number;
	result: "success" | "error";
}) => {
	const statusClass = getStatusClass(statusCode);
	trpcRequestsTotal.labels(procedure, type, result, statusClass).inc();
	trpcRequestDurationSeconds
		.labels(procedure, type, statusClass)
		.observe(durationMs / 1000);
};

export const trackTrpcSubscription = (procedure: string) => {
	trpcActiveSubscriptions.labels(procedure).inc();

	return () => {
		trpcActiveSubscriptions.labels(procedure).dec();
	};
};
