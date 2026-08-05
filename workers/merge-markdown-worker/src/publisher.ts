import { createResilientPublisher } from "@ocr/infra/amqp";
import { getLoggerStore } from "@ocr/infra/libs";
import {
	type MergeMarkdownJobData,
	mergeMarkdownJobDataSchema,
} from "./contracts/merge-markdown.schema.js";

type MergeMarkdownPublisherOptions = {
	amqpUrl: string;
	queue: string;
};

export class MergeMarkdownPublisher {
	private readonly queue: string;
	private readonly publisher: ReturnType<typeof createResilientPublisher>;

	constructor(options: MergeMarkdownPublisherOptions) {
		this.queue = options.queue;
		this.publisher = createResilientPublisher({
			amqpUrl: options.amqpUrl,
			queue: options.queue,
			workerName: "merge-markdown-worker",
		});
	}

	async publish(message: MergeMarkdownJobData) {
		const payload = mergeMarkdownJobDataSchema.parse(message);
		await this.publisher.publish(payload);
		getLoggerStore().info(
			{ queue: this.queue, processId: payload.processId },
			"Published merge markdown job",
		);
	}

	async close() {
		await this.publisher.close();
	}
}
