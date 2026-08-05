import { createResilientPublisher } from "@ocr/infra/amqp";
import { getLoggerStore } from "@ocr/infra/libs";
import {
	type BuildZipJobData,
	buildZipJobDataSchema,
} from "./contracts/build-zip.schema.js";

type BuildZipPublisherOptions = {
	amqpUrl: string;
	queue: string;
};

export class BuildZipPublisher {
	private readonly queue: string;
	private readonly publisher: ReturnType<typeof createResilientPublisher>;

	constructor(options: BuildZipPublisherOptions) {
		this.queue = options.queue;
		this.publisher = createResilientPublisher({
			amqpUrl: options.amqpUrl,
			queue: options.queue,
			workerName: "build-zip-worker",
		});
	}

	async publish(message: BuildZipJobData) {
		const payload = buildZipJobDataSchema.parse(message);
		await this.publisher.publish(payload);
		getLoggerStore().info(
			{ queue: this.queue, processId: payload.processId },
			"Published build zip job",
		);
	}

	async close() {
		await this.publisher.close();
	}
}
