import { pinoLogger } from "@ocr/infra/libs";
import { startConsumer } from "./consumer.js";
import { createContainer } from "./container.js";

const start = async () => {
	const container = createContainer();
	await container.init();

	const workerLogger = pinoLogger.child({ worker: "split-pdf-worker" });
	workerLogger.info("Starting split PDF worker");

	const consumer = startConsumer({ handler: container.handler() });

	let closing = false;
	const close = async (signal: string) => {
		if (closing) {
			return;
		}
		closing = true;

		workerLogger.info({ signal }, "Shutting down split PDF worker");

		try {
			await consumer.end();
			await container.shutdown();
		} catch (error) {
			workerLogger.error({ err: error }, "Split PDF worker shutdown failed");
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
	pinoLogger.error({ err: error }, "Split PDF worker startup failed");
	process.exitCode = 1;
});
