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
		try {
			await processService.splitSourceFileIntoPages(processId);
			const finishedAt = new Date();
			const duration = finishedAt.getTime() - startedAt.getTime();
			await processService.publishProcessStatusEvent({
				processId,
				stage: "split_pdf",
				status: "success",
				durationMs: duration,
				message: "PDF split completed",
			});
			logger.info({ processId, duration }, "Finished PDF split job");
		} catch (error) {
			const finishedAt = new Date();
			const duration = finishedAt.getTime() - startedAt.getTime();
			const message =
				error instanceof Error ? error.message : "PDF split failed";
			await processService.publishProcessStatusEvent({
				processId,
				stage: "split_pdf",
				status: "failed",
				durationMs: duration,
				message,
			});
			throw error;
		}
	};
};
