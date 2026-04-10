import { db } from "@ocr/db";
import { env } from "@ocr/infra/configs";
import { redis } from "@ocr/infra/redis";
import { ensureBucketExists } from "@ocr/infra/s3";

import {
	AuthService,
	FilesService,
	MailService,
	PageService,
	ProcessService,
} from "@ocr/services";
import { SplitPdfPublisher } from "@ocr/split-pdf-worker/publisher";
import { TranscribeJpgPublisher } from "@ocr/transcribe-jpg-worker/publisher";

type AppServices = {
	db: typeof db;
	redis: typeof redis;
	processesService: ProcessService;
	mailService: MailService;
	authService: AuthService;
	filesService: FilesService;
	splitPdfPublisher: SplitPdfPublisher;
	transcribeJpgPublisher: TranscribeJpgPublisher;
	pageService: PageService;
	init: () => Promise<void>;
};

export const createServices = (): AppServices => {
	const mailService = new MailService();
	const filesService = new FilesService(db);
	const splitPdfPublisher: SplitPdfPublisher = new SplitPdfPublisher({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_SPLIT_PDF_QUEUE,
	});
	const transcribeJpgPublisher: TranscribeJpgPublisher =
		new TranscribeJpgPublisher({
			amqpUrl: env.AMQP_URL,
			queue: env.AMQ_TRANSCRIBE_JPG_QUEUE,
		});
	const authService = new AuthService({
		db,
		redis,
		mailService,
	});
	const processesService = new ProcessService({
		db,
		filesService,
		splitPdfPublisher,
		transcribeJpgPublisher,
	});
	const pageService = new PageService({
		db,
		filesService,
		processService: processesService,
	});

	return {
		db,
		redis,
		mailService,
		authService,
		filesService,
		processesService,
		pageService,
		splitPdfPublisher,
		transcribeJpgPublisher,
		init: async () => {
			await ensureBucketExists();
		},
	};
};

export const services = createServices();
