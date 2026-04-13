import { getLoggerStore } from "@ocr/infra";
import amqp from "amqplib";
import {
	type TranscribeJpgJobData,
	transcribeJpgJobDataSchema,
} from "./contracts/transcribe-jpg.schema.js";

type TranscribeJpgPublisherOptions = {
	amqpUrl: string;
	queue: string;
};

export class TranscribeJpgPublisher {
	private amqpUrl: string;
	private queue: string;
	private connection?: amqp.ChannelModel;
	private channelPromise?: Promise<amqp.Channel>;

	constructor(options: TranscribeJpgPublisherOptions) {
		this.amqpUrl = options.amqpUrl;
		this.queue = options.queue;
	}

	private async getChannel() {
		if (!this.channelPromise) {
			this.channelPromise = amqp
				.connect(this.amqpUrl)
				.then(async (connection) => {
					this.connection = connection;
					const channel = await connection.createChannel();
					await channel.assertQueue(this.queue, { durable: true });
					return channel;
				})
				.catch((error) => {
					const logger = getLoggerStore();
					logger.error({ err: error }, "Failed to connect to AMQP server");
					this.channelPromise = undefined;
					throw error;
				});
		}
		return this.channelPromise;
	}

	async publish(message: TranscribeJpgJobData) {
		const payload = transcribeJpgJobDataSchema.parse(message);
		const logger = getLoggerStore();
		const channel = await this.getChannel();
		channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(payload)), {
			persistent: true,
			contentType: "application/json",
		});
		logger.info(
			{ queue: this.queue, pageId: payload.pageId },
			"Published transcribe JPG job",
		);
	}

	async close() {
		const channelPromise = this.channelPromise;
		this.channelPromise = undefined;
		const channel = channelPromise
			? await channelPromise.catch(() => null)
			: null;
		if (channel) {
			await channel.close().catch(() => undefined);
		}
		if (this.connection) {
			await this.connection.close().catch(() => undefined);
			this.connection = undefined;
		}
	}
}
