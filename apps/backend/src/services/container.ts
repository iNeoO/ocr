import { db } from "@ocr/db";
import { redis } from "@ocr/infra/redis";

import {
	AuthService,
	FilesService,
	MailService,
	ProcessService,
} from "@ocr/services";

type AppServices = {
	db: typeof db;
	redis: typeof redis;
	processesService: ProcessService;
	mailService: MailService;
	authService: AuthService;
	filesService: FilesService;
};

export const createServices = (): AppServices => {
	const mailService = new MailService();
	const authService = new AuthService({
		db,
		redis,
		mailService,
	});
	const processesService = new ProcessService(db);
	const filesService = new FilesService(db);

	return {
		db,
		redis,
		mailService,
		authService,
		filesService,
		processesService,
	};
};

export const services = createServices();
