import { env } from "@ocr/infra/configs";
import { loggerStorage, pinoLogger } from "@ocr/infra/libs";
import amqp from "amqplib";
import {
	type PostProcessPageJobData,
	parseRawMessage,
} from "./contracts/post-process-page.schema.js";

type StartConsumerParams = {
	handler: (message: PostProcessPageJobData) => Promise<void>;
	shutdown: () => Promise<void>;
};

export const startConsumer = async ({
	handler,
	shutdown,
}: StartConsumerParams) => {
	const connection = await amqp.connect(env.AMQP_URL);
	const channel = await connection.createChannel();

	await channel.assertQueue(env.AMQ_POST_PROCESS_PAGE_QUEUE, { durable: true });
	await channel.prefetch(env.AMQ_POST_PROCESS_PAGE_PREFETCH);

	pinoLogger.info(
		{
			queue: env.AMQ_POST_PROCESS_PAGE_QUEUE,
			prefetch: env.AMQ_POST_PROCESS_PAGE_PREFETCH,
		},
		"Post-process page worker is consuming",
	);

	const close = async (signal: string) => {
		pinoLogger.info({ signal }, "Shutting down post-process page worker");
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
		env.AMQ_POST_PROCESS_PAGE_QUEUE,
		async (rawMessage) => {
			if (!rawMessage) {
				return;
			}

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
		{ noAck: false },
	);
};
