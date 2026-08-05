import { createResilientPublisher } from "@ocr/infra/amqp";
import { getLoggerStore } from "@ocr/infra/libs";
import {
	type TranscribeJpgJobData,
	transcribeJpgJobDataSchema,
} from "./contracts/transcribe-jpg.schema.js";

type TranscribeJpgPublisherOptions = {
	amqpUrl: string;
	queue: string;
};

export class TranscribeJpgPublisher {
	private readonly queue: string;
	private readonly publisher: ReturnType<typeof createResilientPublisher>;

	constructor(options: TranscribeJpgPublisherOptions) {
		this.queue = options.queue;
		this.publisher = createResilientPublisher({
			amqpUrl: options.amqpUrl,
			queue: options.queue,
			workerName: "transcribe-jpg-worker",
		});
	}

	async publish(message: TranscribeJpgJobData) {
		const payload = transcribeJpgJobDataSchema.parse(message);
		await this.publisher.publish(payload);
		getLoggerStore().info(
			{ queue: this.queue, pageId: payload.pageId },
			"Published transcribe JPG job",
		);
	}

	async close() {
		await this.publisher.close();
	}
}
