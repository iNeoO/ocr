import { getLoggerStore } from "@ocr/infra/libs";
import type { FilesService } from "@ocr/services";
import type { SplitPdfJobData } from "../contracts/split-pdf.schema";

export const createSplitWorker = ({
	fileService,
}: {
	fileService: FilesService;
}) => {
	return async (message: SplitPdfJobData) => {
		const { id } = message;
		const logger = getLoggerStore();
		const startedAt = new Date();
		logger.info({ id }, "Starting PDF split job");
		await fileService.splitFileIntoPages(id);
		const finishedAt = new Date();
		const duration = finishedAt.getTime() - startedAt.getTime();
		logger.info({ id, duration }, "Finished PDF split job");
	};
};
