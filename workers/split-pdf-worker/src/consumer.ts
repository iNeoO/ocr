import { env } from "@ocr/infra/configs";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";
import amqp from "amqplib";

import {
	parseRawMessage,
	type SplitPdfJobData,
} from "./contracts/split-pdf.schema";

type StartConsumerParams = {
	handler: (message: SplitPdfJobData) => Promise<void>;
	shutdown: () => Promise<void>;
};

export const startConsumer = async ({
	handler,
	shutdown,
}: StartConsumerParams) => {
	const connection = await amqp.connect(env.AMQP_URL);
	const channel = await connection.createChannel();

	await channel.assertQueue(env.AMQ_SPLIT_PDF_QUEUE, { durable: true });
	await channel.prefetch(env.AMQ_SPLIT_PDF_PREFETCH);

	pinoLogger.info(
		{
			queue: env.AMQ_SPLIT_PDF_QUEUE,
			prefetch: env.AMQ_SPLIT_PDF_PREFETCH,
		},
		"Split PDF worker is consuming",
	);

	const close = async (signal: string) => {
		pinoLogger.info({ signal }, "Shutting down split PDF worker");
		await channel.close();
		await connection.close();
		await shutdown();
		process.exit(0);
	};

	process.on("SIGINT", () => {
		void close("SIGINT");
	});
	process.on("SIGTERM", () => {
		void close("SIGTERM");
	});

	await channel.consume(
		env.AMQ_SPLIT_PDF_QUEUE,
		async (rawMessage) => {
			if (!rawMessage) {
				return;
			}

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
		{ noAck: false },
	);
};
