import { createResilientPublisher } from "@ocr/infra/amqp";
import {
	type SplitPdfJobData,
	splitPdfJobDataSchema,
} from "./contracts/split-pdf.schema.js";

type SplitPdfPublisherOptions = {
	amqpUrl: string;
	queue: string;
};

export class SplitPdfPublisher {
	private readonly publisher: ReturnType<typeof createResilientPublisher>;

	constructor(options: SplitPdfPublisherOptions) {
		this.publisher = createResilientPublisher({
			amqpUrl: options.amqpUrl,
			queue: options.queue,
			workerName: "split-pdf-worker",
		});
	}

	async publish(message: SplitPdfJobData) {
		const payload = splitPdfJobDataSchema.parse(message);
		await this.publisher.publish(payload);
	}

	async close() {
		await this.publisher.close();
	}
}
