import {
	type ResilientConsumer,
	startResilientConsumer,
} from "@ocr/infra/amqp";
import { env } from "@ocr/infra/configs";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";
import {
	type PostProcessPageJobData,
	parseRawMessage,
} from "./contracts/post-process-page.schema.js";

type StartConsumerParams = {
	handler: (message: PostProcessPageJobData) => Promise<void>;
};

export const startConsumer = ({
	handler,
}: StartConsumerParams): ResilientConsumer =>
	startResilientConsumer({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_POST_PROCESS_PAGE_QUEUE,
		prefetch: env.AMQ_POST_PROCESS_PAGE_PREFETCH,
		workerName: "post-process-page-worker",
		onMessage: async (channel, rawMessage) => {
			const messageLogger = pinoLogger.child({
				worker: "post-process-page-worker",
				queue: env.AMQ_POST_PROCESS_PAGE_QUEUE,
				deliveryTag: rawMessage.fields.deliveryTag,
				messageId: rawMessage.properties.messageId,
				routingKey: rawMessage.fields.routingKey,
			});

			await loggerStorage.run(messageLogger, async () => {
				try {
					const message = parseRawMessage(rawMessage.content);
					messageLogger.info(
						{ pageId: message.pageId },
						"Received post-process page message",
					);
					await handler(message);
					channel.ack(rawMessage);
					messageLogger.info(
						{ pageId: message.pageId },
						"ACK post-process page message",
					);
				} catch (error) {
					messageLogger.error(
						{
							err: error,
							raw: rawMessage.content.toString("utf-8"),
						},
						"Failed to process post-process page message",
					);

					channel.nack(rawMessage, false, false);
				}
			});
		},
	});
