import { createResilientPublisher } from "@ocr/infra/amqp";
import { getLoggerStore } from "@ocr/infra/libs";
import {
	type PostProcessPageJobData,
	postProcessPageJobDataSchema,
} from "./contracts/post-process-page.schema.js";

type PostProcessPagePublisherOptions = {
	amqpUrl: string;
	queue: string;
};

export class PostProcessPagePublisher {
	private readonly queue: string;
	private readonly publisher: ReturnType<typeof createResilientPublisher>;

	constructor(options: PostProcessPagePublisherOptions) {
		this.queue = options.queue;
		this.publisher = createResilientPublisher({
			amqpUrl: options.amqpUrl,
			queue: options.queue,
			workerName: "post-process-page-worker",
		});
	}

	async publish(message: PostProcessPageJobData) {
		const payload = postProcessPageJobDataSchema.parse(message);
		await this.publisher.publish(payload);
		getLoggerStore().info(
			{ queue: this.queue, pageId: payload.pageId },
			"Published post-process page job",
		);
	}

	async close() {
		await this.publisher.close();
	}
}
