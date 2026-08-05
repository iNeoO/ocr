import { db } from "@ocr/db";
import { pinoLogger } from "@ocr/infra";
import { env } from "@ocr/infra/configs";
import { redis } from "@ocr/infra/redis";
import { AuthService } from "@ocr/services/auth/auth.service";
import { FilesService } from "@ocr/services/files/files.service";
import { MailService } from "@ocr/services/mail/mail.service";
import { ProcessService } from "@ocr/services/process/process.service";
import { ProcessStatusPubSubService } from "@ocr/services/process-status/process-status-pubsub.service";
import { SplitPdfPublisher } from "@ocr/split-pdf-worker/publisher";
import { TranscribeJpgPublisher } from "@ocr/transcribe-jpg-worker/publisher";
import { SERVER_CONTAINER_KEY } from "./container-registry";
import { setStaleFinalizingProcesses } from "./metrics";

const STALE_FINALIZING_SAMPLE_INTERVAL_MS = 60_000;
const STALE_FINALIZING_THRESHOLD_MS = 15 * 60_000;

type ServerContainer = {
	db: typeof db;
	redis: typeof redis;
	mailService: MailService;
	authService: AuthService;
	filesService: FilesService;
	processService: ProcessService;
	processStatusPubSubService: ProcessStatusPubSubService;
	splitPdfPublisher: SplitPdfPublisher;
	transcribeJpgPublisher: TranscribeJpgPublisher;
	shutdown: () => Promise<void>;
};

type ContainerGlobal = typeof globalThis & {
	[SERVER_CONTAINER_KEY]?: ServerContainer;
};

const createContainer = (): ServerContainer => {
	const mailService = new MailService();
	const filesService = new FilesService(db);
	const splitPdfPublisher = new SplitPdfPublisher({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_SPLIT_PDF_QUEUE,
	});
	const transcribeJpgPublisher = new TranscribeJpgPublisher({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_TRANSCRIBE_JPG_QUEUE,
	});
	const processStatusPubSubService = new ProcessStatusPubSubService(
		redis,
		env.REDIS_KEY_PREFIX,
	);
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

	const staleFinalizingInterval = setInterval(() => {
		processService
			.countStaleFinalizingProcesses(STALE_FINALIZING_THRESHOLD_MS)
			.then(setStaleFinalizingProcesses)
			.catch((error: unknown) => {
				pinoLogger.warn(
					{ err: error },
					"Failed to sample stale finalizing processes",
				);
			});
	}, STALE_FINALIZING_SAMPLE_INTERVAL_MS);
	staleFinalizingInterval.unref();

	let shutdownPromise: Promise<void> | null = null;

	return {
		db,
		redis,
		mailService,
		authService,
		filesService,
		processService,
		processStatusPubSubService,
		splitPdfPublisher,
		transcribeJpgPublisher,
		shutdown: () => {
			shutdownPromise ??= (async () => {
				clearInterval(staleFinalizingInterval);
				await db.$client.end().catch((error: unknown) => {
					pinoLogger.warn({ err: error }, "Failed to close database pool");
				});
				await redis.quit().catch((error: unknown) => {
					pinoLogger.warn({ err: error }, "Failed to close Redis connection");
				});
				await splitPdfPublisher.close().catch((error: unknown) => {
					pinoLogger.warn(
						{ err: error },
						"Failed to close split-pdf publisher",
					);
				});
				await transcribeJpgPublisher.close().catch((error: unknown) => {
					pinoLogger.warn(
						{ err: error },
						"Failed to close transcribe-jpg publisher",
					);
				});
			})();
			return shutdownPromise;
		},
	};
};

const globalRef = globalThis as ContainerGlobal;

if (!globalRef[SERVER_CONTAINER_KEY]) {
	globalRef[SERVER_CONTAINER_KEY] = createContainer();
}

// No signal handler here on purpose. The container does not own the process:
// `vite preview` (and `vite dev`) install their own SIGTERM handler that closes
// the HTTP server and then calls `process.exit()`. A handler registered here
// would run *concurrently* with that drain — tearing down the pools under
// in-flight requests — and get truncated by the exit. Shutdown is sequenced
// after the HTTP drain by the preview plugin in `vite.config.ts`, which reaches
// this container through `getRunningContainer()`.
export const container: ServerContainer = globalRef[SERVER_CONTAINER_KEY];
