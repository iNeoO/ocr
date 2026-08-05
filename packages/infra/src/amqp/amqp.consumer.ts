import { APP_ERROR } from "@ocr/common";
import amqp, { type Channel, type ConsumeMessage } from "amqplib";
import { InternalError } from "../errors/internal-error.js";
import { pinoLogger } from "../libs/index.js";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

type ConsumerStatus =
	| "connecting"
	| "running"
	| "reconnecting"
	| "shutting-down"
	| "ended";

type StartResilientConsumerParams = {
	amqpUrl: string;
	queue: string;
	prefetch: number;
	workerName: string;
	onMessage: (channel: Channel, message: ConsumeMessage) => Promise<void>;
	retryDelayMs?: (attempt: number) => number;
	heartbeatSeconds?: number;
	drainTimeoutMs?: number;
};

export type ResilientConsumer = {
	/**
	 * Idempotent graceful stop: cancel the consumer, let in-flight messages ack,
	 * then close the channel and the connection. Never rejects.
	 */
	end: () => Promise<void>;
};

/** Exponential backoff with full jitter on the second half, so the workers do
 * not all reconnect on the same tick after a broker restart. */
const defaultRetryDelayMs = (attempt: number) => {
	const base = Math.min(1000 * 2 ** attempt, 30_000);
	return Math.round(base / 2 + Math.random() * (base / 2));
};

/** amqplib defaults `heartbeat` to 0, which disables it: a half-open TCP
 * connection (proxy, NAT, network partition) is then never detected and the
 * worker believes it is still consuming, forever. */
const DEFAULT_HEARTBEAT_SECONDS = 30;

/** Kept below the compose `stop_grace_period` so a stuck handler cannot turn a
 * graceful stop into a SIGKILL. */
const DEFAULT_DRAIN_TIMEOUT_MS = 15_000;

/**
 * amqplib has no built-in reconnect (unlike ioredis). Without this, a broker
 * restart silently drops the connection: the process runs out of event-loop
 * work and exits cleanly (code 0) with no error logged, so it never comes
 * back on its own even with a container restart policy.
 *
 * Reconnection is also triggered by a channel-level close and by a broker-side
 * `basic.cancel` — both leave the connection open, so watching the connection
 * alone yields a live process that consumes nothing.
 *
 * Signals are *not* handled here: the worker bootstrap owns them and calls
 * `end()` before tearing its own container down.
 */
export const startResilientConsumer = ({
	amqpUrl,
	queue,
	prefetch,
	workerName,
	onMessage,
	retryDelayMs = defaultRetryDelayMs,
	heartbeatSeconds = DEFAULT_HEARTBEAT_SECONDS,
	drainTimeoutMs = DEFAULT_DRAIN_TIMEOUT_MS,
}: StartResilientConsumerParams): ResilientConsumer => {
	const logger = pinoLogger.child({ worker: workerName, queue });

	let status: ConsumerStatus = "connecting";
	let activeConnection: AmqpConnection | undefined;
	let activeChannel: Channel | undefined;
	let activeConsumerTag: string | undefined;
	let attempt = 0;
	let reconnectTimer: NodeJS.Timeout | undefined;
	let connectPromise: Promise<void> | undefined;
	let shutdownPromise: Promise<void> | undefined;
	const inFlight = new Set<Promise<void>>();

	const connectUrl = () => {
		const url = new URL(amqpUrl);
		url.searchParams.set("heartbeat", String(heartbeatSeconds));
		return url.toString();
	};

	const safeClose = async (target: Channel | AmqpConnection) => {
		try {
			await target.close();
		} catch (err) {
			logger.debug({ err }, "[AMQP] failed to close resource");
		}
	};

	const dropActiveConnection = async () => {
		const stale = activeConnection;
		activeConnection = undefined;
		activeChannel = undefined;
		activeConsumerTag = undefined;

		if (stale) {
			await safeClose(stale);
		}
	};

	/** Handler rejections would otherwise be swallowed by amqplib (it ignores
	 * the promise returned by the consume callback) and crash the process as an
	 * unhandled rejection. Tracking them also lets shutdown wait for them. */
	const trackInFlight = (task: Promise<void>) => {
		const tracked = task
			.catch((err) => {
				logger.error(
					{ err },
					"[AMQP] unhandled error while processing message",
				);
			})
			.finally(() => {
				inFlight.delete(tracked);
			});

		inFlight.add(tracked);
	};

	const scheduleReconnect = () => {
		if (
			status === "shutting-down" ||
			status === "ended" ||
			reconnectTimer ||
			connectPromise
		) {
			return;
		}

		status = "reconnecting";

		const delay = retryDelayMs(attempt);
		attempt += 1;

		logger.warn({ attempt, delayMs: delay }, "[AMQP] reconnecting");

		reconnectTimer = setTimeout(() => {
			reconnectTimer = undefined;
			startConnecting();
		}, delay);
	};

	const connectAndConsume = async () => {
		// Any status change while we await means a shutdown started underneath us.
		const startStatus = status;

		await dropActiveConnection();

		const connection = await amqp.connect(connectUrl());

		if (status !== startStatus) {
			await safeClose(connection);
			return;
		}

		activeConnection = connection;

		connection.on("error", (err) => {
			logger.error({ err }, "[AMQP] connection error");
		});

		connection.on("close", () => {
			if (activeConnection !== connection) {
				return;
			}

			activeConnection = undefined;
			activeChannel = undefined;
			scheduleReconnect();
		});

		let configuredChannel: Channel | undefined;

		try {
			const channel = await connection.createChannel();
			configuredChannel = channel;
			activeChannel = channel;

			channel.on("error", (err) => {
				logger.error({ err }, "[AMQP] channel error");
			});

			channel.on("close", () => {
				if (activeChannel !== channel) {
					return;
				}

				activeChannel = undefined;
				scheduleReconnect();
			});

			await channel.assertQueue(queue, { durable: true });
			await channel.prefetch(prefetch);

			const { consumerTag } = await channel.consume(
				queue,
				(rawMessage) => {
					if (!rawMessage) {
						logger.warn("[AMQP] consumer was cancelled by the broker");

						if (activeChannel === channel) {
							scheduleReconnect();
						}

						return;
					}

					trackInFlight(
						Promise.resolve().then(() => onMessage(channel, rawMessage)),
					);
				},
				{ noAck: false },
			);

			activeConsumerTag = consumerTag;
		} catch (err) {
			await dropActiveConnection();
			throw err;
		}

		if (status !== startStatus) {
			await dropActiveConnection();
			return;
		}

		if (
			activeConnection !== connection ||
			activeChannel !== configuredChannel
		) {
			await dropActiveConnection();
			throw new InternalError({
				code: APP_ERROR.AMQP_CONSUMER_SETUP_FAILED,
				message: "AMQP resources closed while configuring the consumer",
			});
		}

		status = "running";
		attempt = 0;

		logger.info({ prefetch }, "[AMQP] worker is consuming");
	};

	const connect = async () => {
		const currentAttempt = connectAndConsume();
		connectPromise = currentAttempt;

		try {
			await currentAttempt;
		} finally {
			if (connectPromise === currentAttempt) {
				connectPromise = undefined;
			}
		}
	};

	const startConnecting = () => {
		connect().catch((err) => {
			logger.error({ err }, "[AMQP] connect failed");
			scheduleReconnect();
		});
	};

	const drainInFlight = async () => {
		if (inFlight.size === 0) {
			return;
		}

		logger.info({ inFlight: inFlight.size }, "[AMQP] draining in-flight jobs");

		let drainTimer: NodeJS.Timeout | undefined;
		const timedOut = new Promise<"timed-out">((resolve) => {
			drainTimer = setTimeout(() => resolve("timed-out"), drainTimeoutMs);
		});
		const drained = (async () => {
			while (inFlight.size > 0) {
				await Promise.all(inFlight);
			}
			return "drained" as const;
		})();

		try {
			if ((await Promise.race([drained, timedOut])) === "timed-out") {
				logger.warn(
					{ inFlight: inFlight.size, drainTimeoutMs },
					"[AMQP] drain timed out, closing with jobs still in flight",
				);
			}
		} finally {
			clearTimeout(drainTimer);
		}
	};

	const shutdown = async () => {
		status = "shutting-down";

		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = undefined;
		}

		if (connectPromise) {
			try {
				await connectPromise;
			} catch (err) {
				logger.debug({ err }, "[AMQP] connect failed during shutdown");
			}
		}

		// Stop new deliveries before draining, otherwise prefetch keeps refilling.
		if (activeChannel && activeConsumerTag) {
			try {
				await activeChannel.cancel(activeConsumerTag);
			} catch (err) {
				logger.warn({ err }, "[AMQP] failed to cancel consumer");
			}
		}

		await drainInFlight();

		if (activeChannel) {
			await safeClose(activeChannel);
		}

		if (activeConnection) {
			await safeClose(activeConnection);
		}

		activeChannel = undefined;
		activeConnection = undefined;
		activeConsumerTag = undefined;
		status = "ended";

		logger.info("[AMQP] consumer stopped");
	};

	startConnecting();

	return {
		end: () => {
			shutdownPromise ??= shutdown();
			return shutdownPromise;
		},
	};
};
