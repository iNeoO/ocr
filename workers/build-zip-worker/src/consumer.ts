import {
	type ResilientConsumer,
	startResilientConsumer,
} from "@ocr/infra/amqp";
import { env } from "@ocr/infra/configs";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";

import {
	type BuildZipJobData,
	parseRawMessage,
} from "./contracts/build-zip.schema.js";

type StartConsumerParams = {
	handler: (message: BuildZipJobData) => Promise<void>;
};

export const startConsumer = ({
	handler,
}: StartConsumerParams): ResilientConsumer =>
	startResilientConsumer({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_BUILD_ZIP_QUEUE,
		prefetch: env.AMQ_BUILD_ZIP_PREFETCH,
		workerName: "build-zip-worker",
		onMessage: async (channel, rawMessage) => {
			const messageLogger = pinoLogger.child({
				worker: "build-zip-worker",
				queue: env.AMQ_BUILD_ZIP_QUEUE,
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
						"Failed to process build zip message",
					);

					channel.nack(rawMessage, false, false);
				}
			});
		},
	});
