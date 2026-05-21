import { createFileRoute } from "@tanstack/react-router";
import { metrics } from "../utils/metrics";

const escapeLabelValue = (value: string) =>
	value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');

const sanitizeMetricName = (name: string) => name.replace(/[^a-zA-Z0-9_:]/g, "_");

const metricLine = (
	name: string,
	value: number,
	labels: Record<string, string> = {},
) => {
	const labelEntries = Object.entries(labels);
	const labelText =
		labelEntries.length > 0
			? `{${labelEntries
					.map(([key, labelValue]) => `${key}="${escapeLabelValue(labelValue)}"`)
					.join(",")}}`
			: "";

	return `${name}${labelText} ${Number.isFinite(value) ? value : 0}`;
};

const renderPrometheusMetrics = () => {
	const memory = process.memoryUsage();
	const applicationMetrics = metrics.getAllStats();
	const lines = [
		"# HELP ocr_frontend_uptime_seconds Frontend process uptime in seconds.",
		"# TYPE ocr_frontend_uptime_seconds gauge",
		metricLine("ocr_frontend_uptime_seconds", process.uptime()),
		"# HELP ocr_frontend_memory_bytes Frontend process memory usage in bytes.",
		"# TYPE ocr_frontend_memory_bytes gauge",
		...Object.entries(memory).map(([kind, value]) =>
			metricLine("ocr_frontend_memory_bytes", value, { kind }),
		),
		"# HELP ocr_frontend_metric_count Total number of frontend metric observations.",
		"# TYPE ocr_frontend_metric_count gauge",
		"# HELP ocr_frontend_metric_duration_seconds Frontend metric duration summary in seconds.",
		"# TYPE ocr_frontend_metric_duration_seconds gauge",
	];

	for (const [rawName, stats] of Object.entries(applicationMetrics)) {
		if (!stats) {
			continue;
		}

		const name = sanitizeMetricName(rawName);
		lines.push(
			metricLine("ocr_frontend_metric_count", stats.count, { name }),
			metricLine("ocr_frontend_metric_duration_seconds", stats.avg / 1000, {
				name,
				quantile: "avg",
			}),
			metricLine("ocr_frontend_metric_duration_seconds", stats.p50 / 1000, {
				name,
				quantile: "0.5",
			}),
			metricLine("ocr_frontend_metric_duration_seconds", stats.p95 / 1000, {
				name,
				quantile: "0.95",
			}),
			metricLine("ocr_frontend_metric_duration_seconds", stats.min / 1000, {
				name,
				quantile: "min",
			}),
			metricLine("ocr_frontend_metric_duration_seconds", stats.max / 1000, {
				name,
				quantile: "max",
			}),
		);
	}

	return `${lines.join("\n")}\n`;
};

export const Route = createFileRoute("/metrics")({
	server: {
		handlers: {
			GET: async () => {
				return new Response(renderPrometheusMetrics(), {
					headers: {
						"Content-Type": "text/plain; version=0.0.4; charset=utf-8",
					},
				});
			},
		},
	},
});
