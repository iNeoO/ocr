import { getLoggerStore } from "@ocr/infra/libs";
import type { PageService } from "@ocr/services";
import type { TranscribeJpgJobData } from "../contracts/transcribe-jpg.schema.js";

export const createTranscribeWorker = ({
	pageService,
}: {
	pageService: PageService;
}) => {
	return async (message: TranscribeJpgJobData) => {
		const { pageId } = message;
		const logger = getLoggerStore();
		const startedAt = new Date();
		logger.info({ pageId }, "Starting JPG transcription job");
		await pageService.transcribePage(pageId);
		const finishedAt = new Date();
		const duration = finishedAt.getTime() - startedAt.getTime();
		logger.info({ pageId, duration }, "Finished JPG transcription job");
	};
};
