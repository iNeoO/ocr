import { db } from "@ocr/db";
import { env } from "@ocr/infra/configs";
import { FilesService, ProcessService } from "@ocr/services";
import { TranscribeJpgPublisher } from "@ocr/transcribe-jpg-worker/publisher";
import { createSplitWorker } from "./handler/split-pdf.handler.js";

export const createContainer = () => {
	const filesService = new FilesService(db);
	const transcribeJpgPublisher = new TranscribeJpgPublisher({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_TRANSCRIBE_JPG_QUEUE,
	});
	const processService = new ProcessService({
		db,
		filesService,
		transcribeJpgPublisher,
	});

	return {
		init: () => {},
		shutdown: async () => {
			await transcribeJpgPublisher.close();
			await db.$client.end();
		},
		handler: () => {
			return createSplitWorker({
				processService,
			});
		},
	};
};
