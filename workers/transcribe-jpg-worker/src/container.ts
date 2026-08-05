import { db } from "@ocr/db";
import { env } from "@ocr/infra/configs";
import { redis } from "@ocr/infra/redis";
import { PostProcessPagePublisher } from "@ocr/post-process-page-worker/publisher";
import {
	FilesService,
	LlmService,
	PageService,
	ProcessService,
	ProcessStatusPubSubService,
} from "@ocr/services";
import { createTranscribeWorker } from "./handler/transcribe-jpg.handler.js";

export const createContainer = () => {
	const filesService = new FilesService(db);
	const postProcessPagePublisher = new PostProcessPagePublisher({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_POST_PROCESS_PAGE_QUEUE,
	});
	const processStatusPubSubService = new ProcessStatusPubSubService(
		redis,
		env.REDIS_KEY_PREFIX,
	);
	const processService = new ProcessService({
		db,
		filesService,
		processStatusPubSubService,
	});
	const llmService = new LlmService();
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
			await postProcessPagePublisher.close();
			await db.$client.end();
		},
		handler: () => {
			return createTranscribeWorker({
				pageService,
			});
		},
	};
};
