import { db } from "@ocr/db";
import { FilesService, PageService, ProcessService } from "@ocr/services";
import { createTranscribeWorker } from "./handler/transcribe-jpg.handler.js";

export const createContainer = () => {
	const filesService = new FilesService(db);
	const processService = new ProcessService({
		db,
		filesService,
	});
	const pageService = new PageService({
		db,
		filesService,
		processService,
	});

	return {
		init: () => {},
		shutdown: async () => {
			await db.$client.end();
		},
		handler: () => {
			return createTranscribeWorker({
				pageService,
			});
		},
	};
};
