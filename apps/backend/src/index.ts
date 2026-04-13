import { createServer } from "node:http";
import { pinoLogger } from "@ocr/infra";
import { env } from "@ocr/infra/configs";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { AppRouterBuilder } from "./appRouter.js";
import { getOpenApiHtml, getOpenApiJson } from "./libs/openapi.lib.js";
import { metricsRegistry, observeHttpRequest } from "./metrics.js";
import { services } from "./services/container.js";
import { ContextBuilder } from "./trpc.js";

const appRouter = new AppRouterBuilder(
	services.authService,
	services.processService,
	services.filesService,
	services.processStatusPubSubService,
).create();
const shouldExposeOpenApiUi = env.NODE_ENV !== "production";

const server = createServer((req, res) => {
	const startedAt = Date.now();
	const method = req.method ?? "GET";
	const observeRequest = (route: string) => {
		observeHttpRequest({
			route,
			method,
			statusCode: res.statusCode,
			durationMs: Date.now() - startedAt,
		});
	};

	if (req.url === "/openapi.json") {
		if (!shouldExposeOpenApiUi) {
			res.writeHead(404);
			res.end();
			observeRequest("/openapi.json");
			return;
		}
		res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
		res.end(getOpenApiJson());
		observeRequest("/openapi.json");
		return;
	}

	if (req.url === "/openapi") {
		if (!shouldExposeOpenApiUi) {
			res.writeHead(404);
			res.end();
			observeRequest("/openapi");
			return;
		}

		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(getOpenApiHtml());
		observeRequest("/openapi");
		return;
	}

	if (req.url === "/metrics") {
		res.writeHead(200, {
			"Content-Type": metricsRegistry.contentType,
			"Cache-Control": "no-store",
		});
		void metricsRegistry.metrics().then(
			(metrics) => {
				res.end(metrics);
				observeRequest("/metrics");
			},
			(error: unknown) => {
				pinoLogger.error({ err: error }, "Failed to render Prometheus metrics");
				res.statusCode = 500;
				res.end("Failed to collect metrics");
				observeRequest("/metrics");
			},
		);
		return;
	}

	void nodeHTTPRequestHandler({
		req,
		res,
		router: appRouter,
		createContext: new ContextBuilder(services.authService).create(),
		path: req.url?.replace(/^\//, "") ?? "",
		onError({ error, path, type, input, ctx }) {
			const logger = ctx?.logger ?? pinoLogger;
			logger.error(
				{
					err: error,
					trpc: {
						path: path ?? "unknown",
						type: type ?? "unknown",
					},
					input,
				},
				"tRPC handler error",
			);
		},
	});
	res.once("finish", () => {
		observeRequest("/trpc");
	});
});

const gracefulShutdown = async (signal: string) => {
	pinoLogger.info(`${signal} received. Graceful shutdown initiated.`);
	await new Promise<void>((resolve, reject) => {
		server.close((err) => {
			if (err) {
				reject(err);
			} else {
				pinoLogger.info("HTTP server closed");
				resolve();
			}
		});
	});

	await services.db.$client.end();
	await services.redis.quit();
	await services.splitPdfPublisher.close();
	await services.transcribeJpgPublisher.close();
	await services.postProcessPagePublisher.close();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

await services.init();
server.listen(env.BACKEND_PORT);
