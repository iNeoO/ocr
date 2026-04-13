import { db } from "@ocr/db";
import { env } from "@ocr/infra/configs";
import { redis } from "@ocr/infra/redis";
import { ensureBucketExists } from "@ocr/infra/s3";
import { PostProcessPagePublisher } from "@ocr/post-process-page-worker/publisher";
import {
	AuthService,
	FilesService,
	LlmService,
	MailService,
	PageService,
	ProcessService,
	ProcessStatusPubSubService,
} from "@ocr/services";
import { SplitPdfPublisher } from "@ocr/split-pdf-worker/publisher";
import { TranscribeJpgPublisher } from "@ocr/transcribe-jpg-worker/publisher";

type AppServices = {
	db: typeof db;
	redis: typeof redis;
	processService: ProcessService;
	mailService: MailService;
	authService: AuthService;
	filesService: FilesService;
	splitPdfPublisher: SplitPdfPublisher;
	transcribeJpgPublisher: TranscribeJpgPublisher;
	postProcessPagePublisher: PostProcessPagePublisher;
	processStatusPubSubService: ProcessStatusPubSubService;
	pageService: PageService;
	init: () => Promise<void>;
};

export const createServices = (): AppServices => {
	const mailService = new MailService();
	const filesService = new FilesService(db);
	const splitPdfPublisher: SplitPdfPublisher = new SplitPdfPublisher();
	const llmService = new LlmService();
	const postProcessPagePublisher = new PostProcessPagePublisher();
	const processStatusPubSubService = new ProcessStatusPubSubService(redis);
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
	const processService = new ProcessService({
		db,
		filesService,
		splitPdfPublisher,
		transcribeJpgPublisher,
		processStatusPubSubService,
	});
	const pageService = new PageService({
		db,
		filesService,
		processService,
		llmService,
		postProcessPagePublisher,
	});

	return {
		db,
		redis,
		mailService,
		authService,
		filesService,
		processService,
		pageService,
		splitPdfPublisher,
		transcribeJpgPublisher,
		postProcessPagePublisher,
		processStatusPubSubService,
		init: async () => {
			await ensureBucketExists();
		},
	};
};

export const services = createServices();
