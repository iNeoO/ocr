import { pinoLogger } from "@ocr/infra/libs";
import { startConsumer } from "./consumer.js";
import { createContainer } from "./container.js";

const start = async () => {
	const container = createContainer();
	await container.init();

	const workerLogger = pinoLogger.child({ worker: "merge-markdown-worker" });
	workerLogger.info("Starting merge markdown worker");

	const consumer = startConsumer({ handler: container.handler() });

	let closing = false;
	const close = async (signal: string) => {
		if (closing) {
			return;
		}
		closing = true;

		workerLogger.info({ signal }, "Shutting down merge markdown worker");

		try {
			await consumer.end();
			await container.shutdown();
		} catch (error) {
			workerLogger.error(
				{ err: error },
				"Merge markdown worker shutdown failed",
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
	pinoLogger.error({ err: error }, "Merge markdown worker startup failed");
	process.exitCode = 1;
});
