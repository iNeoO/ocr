import {
	type ResilientConsumer,
	startResilientConsumer,
} from "@ocr/infra/amqp";
import { env } from "@ocr/infra/configs";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";

import {
	parseRawMessage,
	type SplitPdfJobData,
} from "./contracts/split-pdf.schema.js";

type StartConsumerParams = {
	handler: (message: SplitPdfJobData) => Promise<void>;
};

export const startConsumer = ({
	handler,
}: StartConsumerParams): ResilientConsumer =>
	startResilientConsumer({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_SPLIT_PDF_QUEUE,
		prefetch: env.AMQ_SPLIT_PDF_PREFETCH,
		workerName: "split-pdf-worker",
		onMessage: async (channel, rawMessage) => {
			const messageLogger = pinoLogger.child({
				worker: "split-pdf-worker",
				queue: env.AMQ_SPLIT_PDF_QUEUE,
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
						"Failed to process split PDF message",
					);

					channel.nack(rawMessage, false, false);
				}
			});
		},
	});
