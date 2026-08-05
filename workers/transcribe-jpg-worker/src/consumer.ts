import {
	type ResilientConsumer,
	startResilientConsumer,
} from "@ocr/infra/amqp";
import { env } from "@ocr/infra/configs";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";
import {
	parseRawMessage,
	type TranscribeJpgJobData,
} from "./contracts/transcribe-jpg.schema.js";

type StartConsumerParams = {
	handler: (message: TranscribeJpgJobData) => Promise<void>;
};

export const startConsumer = ({
	handler,
}: StartConsumerParams): ResilientConsumer =>
	startResilientConsumer({
		amqpUrl: env.AMQP_URL,
		queue: env.AMQ_TRANSCRIBE_JPG_QUEUE,
		prefetch: env.AMQ_TRANSCRIBE_JPG_PREFETCH,
		workerName: "transcribe-jpg-worker",
		onMessage: async (channel, rawMessage) => {
			const messageLogger = pinoLogger.child({
				worker: "transcribe-jpg-worker",
				queue: env.AMQ_TRANSCRIBE_JPG_QUEUE,
				deliveryTag: rawMessage.fields.deliveryTag,
				messageId: rawMessage.properties.messageId,
				routingKey: rawMessage.fields.routingKey,
			});

			await loggerStorage.run(messageLogger, async () => {
				try {
					const message = parseRawMessage(rawMessage.content);
					messageLogger.info(
						{ pageId: message.pageId },
						"Received transcribe JPG message",
					);
					await handler(message);
					channel.ack(rawMessage);
					messageLogger.info(
						{ pageId: message.pageId },
						"ACK transcribe JPG message",
					);
				} catch (error) {
					messageLogger.error(
						{
							err: error,
							raw: rawMessage.content.toString("utf-8"),
						},
						"Failed to process transcribe JPG message",
					);

					channel.nack(rawMessage, false, false);
				}
			});
		},
	});
