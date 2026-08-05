import { getLoggerStore } from "@ocr/infra/libs";
import type { ProcessService } from "@ocr/services";
import type { MergeMarkdownJobData } from "../contracts/merge-markdown.schema.js";

export const createMergeMarkdownWorker = ({
	processService,
}: {
	processService: ProcessService;
}) => {
	return async (message: MergeMarkdownJobData) => {
		const { processId } = message;
		const logger = getLoggerStore();
		logger.info({ processId }, "Starting merge markdown job");

		try {
			await processService.mergeProcessMarkdown(processId);
			logger.info({ processId }, "Finished merge markdown job");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Merge markdown job failed";
			await processService.failFinalization(processId, message);
			throw error;
		}
	};
};
