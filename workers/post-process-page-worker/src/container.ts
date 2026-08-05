import { BuildZipPublisher } from "@ocr/build-zip-worker/publisher";
import { db } from "@ocr/db";
import { env } from "@ocr/infra/configs";
import { redis } from "@ocr/infra/redis";
import { MergeMarkdownPublisher } from "@ocr/merge-markdown-worker/publisher";
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
	const processStatusPubSubService = new ProcessStatusPubSubService(
		redis,
		env.REDIS_KEY_PREFIX,
	);
	const buildZipPublisher = new BuildZipPublisher({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_BUILD_ZIP_QUEUE,
	});
	const mergeMarkdownPublisher = new MergeMarkdownPublisher({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_MERGE_MARKDOWN_QUEUE,
	});
	const processService = new ProcessService({
		db,
		filesService,
		buildZipPublisher,
		mergeMarkdownPublisher,
		processStatusPubSubService,
	});
	const llmService = new LlmService();
	const postProcessPagePublisher = new PostProcessPagePublisher({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_POST_PROCESS_PAGE_QUEUE,
	});
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
			await buildZipPublisher.close();
			await mergeMarkdownPublisher.close();
			await db.$client.end();
		},
		handler: () => {
			return createPostProcessPageWorker({
				pageService,
			});
		},
	};
};
