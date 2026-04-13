import { db } from "@ocr/db";
import { redis } from "@ocr/infra/redis";
import {
	FilesService,
	ProcessService,
	ProcessStatusPubSubService,
} from "@ocr/services";
import { createCleanupProcessesWorker } from "./handler/cleanup-processes.handler.js";

export const createContainer = () => {
	const filesService = new FilesService(db);
	const processStatusPubSubService = new ProcessStatusPubSubService(redis);
	const processService = new ProcessService({
		db,
		filesService,
		processStatusPubSubService,
	});

	return {
		init: () => {},
		shutdown: async () => {
			await db.$client.end();
		},
		handler: () => {
			return createCleanupProcessesWorker({
				processService,
			});
		},
	};
};
