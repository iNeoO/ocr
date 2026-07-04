import process from "node:process";
import amqp, { type Channel, type ConsumeMessage } from "amqplib";
import { pinoLogger } from "../libs/index.js";

type StartResilientConsumerParams = {
	amqpUrl: string;
	queue: string;
	prefetch: number;
	workerName: string;
	onMessage: (channel: Channel, message: ConsumeMessage) => Promise<void>;
	shutdown: () => Promise<void>;
	retryDelayMs?: (attempt: number) => number;
};

const defaultRetryDelayMs = (attempt: number) =>
	Math.min(1000 * 2 ** attempt, 30_000);

/**
 * amqplib has no built-in reconnect (unlike ioredis). Without this, a broker
 * restart silently drops the connection: the process runs out of event-loop
 * work and exits cleanly (code 0) with no error logged, so it never comes
 * back on its own even with a container restart policy.
 */
export const startResilientConsumer = ({
	amqpUrl,
	queue,
	prefetch,
	workerName,
	onMessage,
	shutdown,
	retryDelayMs = defaultRetryDelayMs,
}: StartResilientConsumerParams) => {
	let stopping = false;
	let attempt = 0;
	let activeConnection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
	let activeChannel: Channel | undefined;

	const scheduleReconnect = () => {
		if (stopping) {
			return;
		}

		const delay = retryDelayMs(attempt);
		attempt += 1;

		pinoLogger.warn(
			{ worker: workerName, queue, attempt, delayMs: delay },
			"[AMQP] reconnecting",
		);

		setTimeout(() => {
			void connectAndConsume();
		}, delay);
	};

	const connectAndConsume = async () => {
		try {
			const connection = await amqp.connect(amqpUrl);
			const channel = await connection.createChannel();

			activeConnection = connection;
			activeChannel = channel;
			attempt = 0;

			await channel.assertQueue(queue, { durable: true });
			await channel.prefetch(prefetch);

			pinoLogger.info(
				{ worker: workerName, queue, prefetch },
				"[AMQP] worker is consuming",
			);

			connection.on("error", (error) => {
				pinoLogger.error(
					{ worker: workerName, err: error },
					"[AMQP] connection error",
				);
			});

			connection.on("close", () => {
				activeConnection = undefined;
				activeChannel = undefined;
				scheduleReconnect();
			});

			await channel.consume(
				queue,
				async (rawMessage) => {
					if (!rawMessage) {
						return;
					}

					await onMessage(channel, rawMessage);
				},
				{ noAck: false },
			);
		} catch (error) {
			pinoLogger.error(
				{ worker: workerName, err: error },
				"[AMQP] connect failed",
			);
			scheduleReconnect();
		}
	};

	const close = async (signal: string) => {
		stopping = true;
		pinoLogger.info({ worker: workerName, signal }, "Shutting down worker");

		await activeChannel?.close().catch(() => {});
		await activeConnection?.close().catch(() => {});
		await shutdown();
		process.exit(0);
	};

	process.on("SIGINT", () => {
		void close("SIGINT");
	});
	process.on("SIGTERM", () => {
		void close("SIGTERM");
	});

	void connectAndConsume();
};
