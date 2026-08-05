import {
	type ResilientConsumer,
	startResilientConsumer,
} from "@ocr/infra/amqp";
import { env } from "@ocr/infra/configs";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";

import {
	type MergeMarkdownJobData,
	parseRawMessage,
} from "./contracts/merge-markdown.schema.js";

type StartConsumerParams = {
	handler: (message: MergeMarkdownJobData) => Promise<void>;
};

export const startConsumer = ({
	handler,
}: StartConsumerParams): ResilientConsumer =>
	startResilientConsumer({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_MERGE_MARKDOWN_QUEUE,
		prefetch: env.AMQ_MERGE_MARKDOWN_PREFETCH,
		workerName: "merge-markdown-worker",
		onMessage: async (channel, rawMessage) => {
			const messageLogger = pinoLogger.child({
				worker: "merge-markdown-worker",
				queue: env.AMQ_MERGE_MARKDOWN_QUEUE,
				deliveryTag: rawMessage.fields.deliveryTag,
				messageId: rawMessage.properties.messageId,
				routingKey: rawMessage.fields.routingKey,
			});

			await loggerStorage.run(messageLogger, async () => {
				try {
					const message = parseRawMessage(rawMessage.content);
					await handler(message);
					channel.ack(rawMessage);
				} catch (error) {
					messageLogger.error(
						{
							err: error,
							raw: rawMessage.content.toString("utf-8"),
						},
						"Failed to process merge markdown message",
					);

					channel.nack(rawMessage, false, false);
				}
			});
		},
	});
