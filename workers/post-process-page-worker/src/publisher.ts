import { getLoggerStore } from "@ocr/infra";
import { env } from "@ocr/infra/configs";
import amqp from "amqplib";
import {
	type PostProcessPageJobData,
	postProcessPageJobDataSchema,
} from "./contracts/post-process-page.schema.js";

export class PostProcessPagePublisher {
	private amqpUrl: string;
	private queue: string;
	private connection?: amqp.ChannelModel;
	private channelPromise?: Promise<amqp.Channel>;

	constructor() {
		this.amqpUrl = env.AMQP_URL;
		this.queue = env.AMQ_POST_PROCESS_PAGE_QUEUE;
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

	async publish(message: PostProcessPageJobData) {
		const payload = postProcessPageJobDataSchema.parse(message);
		const logger = getLoggerStore();
		const channel = await this.getChannel();
		channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(payload)), {
			persistent: true,
			contentType: "application/json",
		});
		logger.info(
			{ queue: this.queue, pageId: payload.pageId },
			"Published post-process page job",
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
