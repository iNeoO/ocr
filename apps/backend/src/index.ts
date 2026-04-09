import { createServer } from "node:http";
import { pinoLogger } from "@ocr/infra";
import { env } from "@ocr/infra/configs";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";

import { AppRouterBuilder } from "./appRouter.js";
import { getOpenApiHtml, getOpenApiJson } from "./libs/openapi.lib.js";
import { services } from "./services/container.js";
import { ContextBuilder } from "./trpc.js";

const appRouter = new AppRouterBuilder(
	services.authService,
	services.processesService,
).create();
const shouldExposeOpenApiUi = env.NODE_ENV !== "production";

const server = createServer((req, res) => {
	if (req.url === "/openapi.json") {
		if (!shouldExposeOpenApiUi) {
			res.writeHead(404);
			res.end();
			return;
		}
		res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
		res.end(getOpenApiJson());
		return;
	}

	if (req.url === "/openapi") {
		if (!shouldExposeOpenApiUi) {
			res.writeHead(404);
			res.end();
			return;
		}

		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(getOpenApiHtml());
		return;
	}

	void nodeHTTPRequestHandler({
		req,
		res,
		router: appRouter,
		createContext: new ContextBuilder(services.authService).create(),
		path: req.url?.replace(/^\//, "") ?? "",
	});
});

server.listen(env.BACKEND_PORT);

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
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
