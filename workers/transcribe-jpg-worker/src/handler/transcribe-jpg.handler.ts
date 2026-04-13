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
		try {
			await pageService.transcribePage(pageId);
			const finishedAt = new Date();
			const duration = finishedAt.getTime() - startedAt.getTime();
			await pageService.publishProcessStatusEventForPage({
				pageId,
				stage: "transcribe_page",
				status: "success",
				durationMs: duration,
				message: "Page transcription completed",
			});
			logger.info({ pageId, duration }, "Finished JPG transcription job");
		} catch (error) {
			const finishedAt = new Date();
			const duration = finishedAt.getTime() - startedAt.getTime();
			const message =
				error instanceof Error ? error.message : "Page transcription failed";
			await pageService.publishProcessStatusEventForPage({
				pageId,
				stage: "transcribe_page",
				status: "failed",
				durationMs: duration,
				message,
			});
			throw error;
		}
	};
};
