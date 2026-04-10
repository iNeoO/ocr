import { getLoggerStore } from "@ocr/infra/libs";
import { ProcessService } from "@ocr/services";

export const createCleanupProcessesWorker = ({
	processService,
}: {
	processService: ProcessService;
}) => {
	return async () => {
		const logger = getLoggerStore();
		const startedAt = new Date();
		logger.info(
			{
				retentionDays: ProcessService.RETENTION_DAYS,
			},
			"Starting expired process cleanup job",
		);
		const deletedProcessCount = await processService.cleanupExpiredProcesses();
		const duration = Date.now() - startedAt.getTime();
		logger.info(
			{
				deletedProcessCount,
				duration,
			},
			"Finished expired process cleanup job",
		);
	};
};
