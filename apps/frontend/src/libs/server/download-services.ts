import { db } from "@ocr/db";
import { FilesService, ProcessService } from "@ocr/services";

const filesService = new FilesService(db);
const processService = new ProcessService({
	db,
	filesService,
});

export const downloadServices = {
	processService,
};
