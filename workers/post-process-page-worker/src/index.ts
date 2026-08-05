import { pinoLogger } from "@ocr/infra/libs";
import { startConsumer } from "./consumer.js";
import { createContainer } from "./container.js";

const start = async () => {
	const container = createContainer();
	await container.init();

	const workerLogger = pinoLogger.child({ worker: "post-process-page-worker" });
	workerLogger.info("Starting post-process page worker");

	const consumer = startConsumer({ handler: container.handler() });

	let closing = false;
	const close = async (signal: string) => {
		if (closing) {
			return;
		}
		closing = true;

		workerLogger.info({ signal }, "Shutting down post-process page worker");

		try {
			await consumer.end();
			await container.shutdown();
		} catch (error) {
			workerLogger.error(
				{ err: error },
				"Post-process page worker shutdown failed",
			);
			process.exit(1);
		}

		process.exit(0);
	};

	process.on("SIGINT", () => {
		void close("SIGINT");
	});
	process.on("SIGTERM", () => {
		void close("SIGTERM");
	});
};

start().catch((error) => {
	pinoLogger.error({ err: error }, "Post-process page worker startup failed");
	process.exitCode = 1;
});
