import { createFileRoute } from "@tanstack/react-router";
import { metricsContentType, renderMetrics } from "../libs/server/metrics";

export const Route = createFileRoute("/metrics")({
	server: {
		handlers: {
			GET: async () => {
				return new Response(await renderMetrics(), {
					headers: {
						"Content-Type": metricsContentType,
						"Cache-Control": "no-store",
					},
				});
			},
		},
	},
});
