import { db } from "@ocr/db";
import { FilesService } from "@ocr/services/files/files.service";
import { ProcessService } from "@ocr/services/process/process.service";

const filesService = new FilesService(db);
const processService = new ProcessService({
	db,
	filesService,
});

export const downloadServices = {
	processService,
};
