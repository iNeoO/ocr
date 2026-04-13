import { db } from "@ocr/db";
import { redis } from "@ocr/infra/redis";
import {
	FilesService,
	LlmService,
	PageService,
	ProcessService,
	ProcessStatusPubSubService,
} from "@ocr/services";
import { createPostProcessPageWorker } from "./handler/post-process-page.handler.js";
import { PostProcessPagePublisher } from "./publisher.js";

export const createContainer = () => {
	const filesService = new FilesService(db);
	const processStatusPubSubService = new ProcessStatusPubSubService(redis);
	const processService = new ProcessService({
		db,
		filesService,
		processStatusPubSubService,
	});
	const llmService = new LlmService();
	const postProcessPagePublisher = new PostProcessPagePublisher();
	const pageService = new PageService({
		db,
		filesService,
		processService,
		llmService,
		postProcessPagePublisher,
	});

	return {
		init: () => {},
		shutdown: async () => {
			await db.$client.end();
		},
		handler: () => {
			return createPostProcessPageWorker({
				pageService,
			});
		},
	};
};
