import { getLoggerStore } from "@ocr/infra/libs";
import type { ProcessService } from "@ocr/services";
import type { SplitPdfJobData } from "../contracts/split-pdf.schema.js";

export const createSplitWorker = ({
	processService,
}: {
	processService: ProcessService;
}) => {
	return async (message: SplitPdfJobData) => {
		const { processId } = message;
		const logger = getLoggerStore();
		const startedAt = new Date();
		logger.info({ processId }, "Starting PDF split job");
		await processService.splitSourceFileIntoPages(processId);
		const finishedAt = new Date();
		const duration = finishedAt.getTime() - startedAt.getTime();
		logger.info({ processId, duration }, "Finished PDF split job");
	};
};
