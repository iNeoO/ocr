import cron from "node-cron";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";
import { createContainer } from "./container.js";

const CRON_SCHEDULE = "0 */2 * * *";

const start = async () => {
	const container = createContainer();
	await container.init();
	const handler = container.handler();
	const workerLogger = pinoLogger.child({
		worker: "cleanup-process-worker",
		schedule: CRON_SCHEDULE,
	});

	workerLogger.info(
		{
			schedule: CRON_SCHEDULE,
		},
		"Starting cleanup process worker",
	);

	const task = cron.schedule(
		CRON_SCHEDULE,
		() => {
			void loggerStorage.run(workerLogger, async () => {
				try {
					await handler();
				} catch (error) {
					workerLogger.error(
						{ err: error },
						"Expired process cleanup job failed",
					);
				}
			});
		},
		{
			timezone: "UTC",
		},
	);

	const close = async (signal: string) => {
		workerLogger.info({ signal }, "Shutting down cleanup process worker");
		task.stop();
		await container.shutdown();
		process.exit(0);
	};

	process.on("SIGINT", () => {
		void close("SIGINT");
	});
	process.on("SIGTERM", () => {
		void close("SIGTERM");
	});

	await loggerStorage.run(workerLogger, async () => {
		await handler();
	});
};

start().catch((error) => {
	pinoLogger.error({ err: error }, "Cleanup process worker startup failed");
	process.exitCode = 1;
});
