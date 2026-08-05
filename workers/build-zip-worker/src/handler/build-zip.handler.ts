import { APP_ERROR } from "@ocr/common";
import { InternalError } from "@ocr/infra";
import { getLoggerStore } from "@ocr/infra/libs";
import type { ProcessService } from "@ocr/services";
import type { BuildZipJobData } from "../contracts/build-zip.schema.js";

export const createBuildZipWorker = ({
	processService,
}: {
	processService: ProcessService;
}) => {
	return async (message: BuildZipJobData) => {
		const { processId } = message;
		const logger = getLoggerStore();
		logger.info({ processId }, "Starting build zip job");

		try {
			const process = await processService.getProcessById(processId);
			if (!process) {
				throw new InternalError({
					code: APP_ERROR.PROCESS_NOT_FOUND,
					message: "Process not found",
				});
			}

			await processService.finalizeZip(processId, process.userId);
			logger.info({ processId }, "Finished build zip job");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Build zip job failed";
			await processService.failFinalization(processId, message);
			throw error;
		}
	};
};
