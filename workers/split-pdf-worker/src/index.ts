import { pinoLogger } from "@ocr/infra/libs";
import { startConsumer } from "./consumer.js";
import { createContainer } from "./container.js";

const start = async () => {
	const container = createContainer();
	await container.init();
	pinoLogger.info("Starting split PDF worker");
	await startConsumer({
		handler: container.handler(),
		shutdown: container.shutdown,
	});
};

start().catch((error) => {
	pinoLogger.error({ err: error }, "Split PDF worker startup failed");
	process.exitCode = 1;
});
