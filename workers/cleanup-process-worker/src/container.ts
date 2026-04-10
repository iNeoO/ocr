import { db } from "@ocr/db";
import { FilesService, ProcessService } from "@ocr/services";
import { createCleanupProcessesWorker } from "./handler/cleanup-processes.handler.js";

export const createContainer = () => {
	const filesService = new FilesService(db);
	const processService = new ProcessService({
		db,
		filesService,
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
