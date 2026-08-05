import { pinoLogger } from "@ocr/infra/libs";
import { startConsumer } from "./consumer.js";
import { createContainer } from "./container.js";

const start = async () => {
	const container = createContainer();
	await container.init();

	const workerLogger = pinoLogger.child({ worker: "transcribe-jpg-worker" });
	workerLogger.info("Starting transcribe JPG worker");

	const consumer = startConsumer({ handler: container.handler() });

	let closing = false;
	const close = async (signal: string) => {
		if (closing) {
			return;
		}
		closing = true;

		workerLogger.info({ signal }, "Shutting down transcribe JPG worker");

		try {
			await consumer.end();
			await container.shutdown();
		} catch (error) {
			workerLogger.error(
				{ err: error },
				"Transcribe JPG worker shutdown failed",
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
	pinoLogger.error({ err: error }, "Transcribe JPG worker startup failed");
	process.exitCode = 1;
});
