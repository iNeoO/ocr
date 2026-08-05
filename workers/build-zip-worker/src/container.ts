import { db } from "@ocr/db";
import { env } from "@ocr/infra/configs";
import { redis } from "@ocr/infra/redis";
import {
	FilesService,
	ProcessService,
	ProcessStatusPubSubService,
} from "@ocr/services";
import { createBuildZipWorker } from "./handler/build-zip.handler.js";

export const createContainer = () => {
	const filesService = new FilesService(db);
	const processStatusPubSubService = new ProcessStatusPubSubService(
		redis,
		env.REDIS_KEY_PREFIX,
	);
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
			return createBuildZipWorker({
				processService,
			});
		},
	};
};
