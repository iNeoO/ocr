import { db } from "@ocr/db";
import { redis } from "@ocr/infra/redis";

import { AuthService, FilesService, MailService } from "@ocr/services";

type AppServices = {
	db: typeof db;
	redis: typeof redis;
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
	const filesService = new FilesService(db);

	return {
		db,
		redis,
		mailService,
		authService,
		filesService,
	};
};

export const services = createServices();
