import { getLoggerStore } from "@ocr/infra/libs";
import type { PageService } from "@ocr/services";
import type { PostProcessPageJobData } from "../contracts/post-process-page.schema.js";

export const createPostProcessPageWorker = ({
	pageService,
}: {
	pageService: PageService;
}) => {
	return async (message: PostProcessPageJobData) => {
		const { pageId } = message;
		const logger = getLoggerStore();
		const startedAt = new Date();
		logger.info({ pageId }, "Starting page post-processing job");
		try {
			await pageService.postProcessPage(pageId);
			const finishedAt = new Date();
			const duration = finishedAt.getTime() - startedAt.getTime();
			await pageService.publishProcessStatusEventForPage({
				pageId,
				stage: "post_process_page",
				status: "success",
				durationMs: duration,
				message: "Page post-processing completed",
			});
			logger.info({ pageId, duration }, "Finished page post-processing job");
		} catch (error) {
			const finishedAt = new Date();
			const duration = finishedAt.getTime() - startedAt.getTime();
			const message =
				error instanceof Error ? error.message : "Page post-processing failed";
			await pageService.publishProcessStatusEventForPage({
				pageId,
				stage: "post_process_page",
				status: "failed",
				durationMs: duration,
				message,
			});
			throw error;
		}
	};
};
