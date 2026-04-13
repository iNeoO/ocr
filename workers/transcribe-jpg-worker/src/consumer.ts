import { env } from "@ocr/infra/configs";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";
import amqp from "amqplib";
import {
	parseRawMessage,
	type TranscribeJpgJobData,
} from "./contracts/transcribe-jpg.schema.js";

type StartConsumerParams = {
	handler: (message: TranscribeJpgJobData) => Promise<void>;
	shutdown: () => Promise<void>;
};

export const startConsumer = async ({
	handler,
	shutdown,
}: StartConsumerParams) => {
	const connection = await amqp.connect(env.AMQP_URL);
	const channel = await connection.createChannel();

	await channel.assertQueue(env.AMQ_TRANSCRIBE_JPG_QUEUE, { durable: true });
	await channel.prefetch(env.AMQ_TRANSCRIBE_JPG_PREFETCH);

	pinoLogger.info(
		{
			queue: env.AMQ_TRANSCRIBE_JPG_QUEUE,
			prefetch: env.AMQ_TRANSCRIBE_JPG_PREFETCH,
		},
		"Transcribe JPG worker is consuming",
	);

	const close = async (signal: string) => {
		pinoLogger.info({ signal }, "Shutting down transcribe JPG worker");
		await channel.close();
		await connection.close();
		await shutdown();
		process.exit(0);
	};

	process.on("SIGINT", () => {
		close("SIGINT");
	});
	process.on("SIGTERM", () => {
		close("SIGTERM");
	});

	await channel.consume(
		env.AMQ_TRANSCRIBE_JPG_QUEUE,
		async (rawMessage) => {
			if (!rawMessage) {
				return;
			}

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
		{ noAck: false },
	);
};
