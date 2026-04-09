import { db } from "@ocr/db";
import { FilesService } from "@ocr/services";
import { createSplitWorker } from "./handler/split-pdf.handler";

export const createContainer = () => {
	const filesService = new FilesService(db);

	return {
		init: () => {},
		shutdown: async () => {
			await db.$client.end();
		},
		handler: () => {
			return createSplitWorker({
				fileService: filesService,
			});
		},
	};
};
