import amqp, { type Channel } from "amqplib";
import { pinoLogger } from "../libs/index.js";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

type CreateResilientPublisherParams = {
	amqpUrl: string;
	queue: string;
	workerName: string;
	heartbeatSeconds?: number;
};

export type ResilientPublisher = {
	publish: (message: unknown) => Promise<void>;
	close: () => Promise<void>;
};

const DEFAULT_HEARTBEAT_SECONDS = 30;

export const createResilientPublisher = ({
	amqpUrl,
	queue,
	workerName,
	heartbeatSeconds = DEFAULT_HEARTBEAT_SECONDS,
}: CreateResilientPublisherParams): ResilientPublisher => {
	const logger = pinoLogger.child({ worker: workerName, queue });

	let connection: AmqpConnection | undefined;
	let channel: Channel | undefined;
	let channelPromise: Promise<Channel> | undefined;

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

	/** Resets cached state so the next publish() reconnects from scratch. Wired
	 * to both connection "close" and channel "close": a channel-level close
	 * (e.g. a channel error) can happen while the connection stays open. */
	const dropConnection = () => {
		const staleChannel = channel;
		const staleConnection = connection;

		channel = undefined;
		connection = undefined;
		channelPromise = undefined;

		return { staleChannel, staleConnection };
	};

	const connect = async (): Promise<Channel> => {
		const nextConnection = await amqp.connect(connectUrl());
		connection = nextConnection;

		nextConnection.on("error", (err) => {
			logger.error({ err }, "[AMQP] connection error");
		});
		nextConnection.on("close", () => {
			if (connection === nextConnection) {
				dropConnection();
			}
		});

		const nextChannel = await nextConnection.createChannel();
		channel = nextChannel;

		nextChannel.on("error", (err) => {
			logger.error({ err }, "[AMQP] channel error");
		});
		nextChannel.on("close", () => {
			if (channel === nextChannel) {
				dropConnection();
			}
		});

		await nextChannel.assertQueue(queue, { durable: true });

		return nextChannel;
	};

	const ensureChannel = (): Promise<Channel> => {
		if (channel) {
			return Promise.resolve(channel);
		}

		if (!channelPromise) {
			channelPromise = connect().catch((err) => {
				channelPromise = undefined;
				throw err;
			});
		}

		return channelPromise;
	};

	const publish = async (message: unknown) => {
		const activeChannel = await ensureChannel();
		const payload = Buffer.from(JSON.stringify(message));

		const ok = activeChannel.sendToQueue(queue, payload, {
			persistent: true,
			contentType: "application/json",
		});

		if (!ok) {
			await new Promise<void>((resolve) =>
				activeChannel.once("drain", resolve),
			);
		}
	};

	const close = async () => {
		const { staleChannel, staleConnection } = dropConnection();

		if (staleChannel) {
			await safeClose(staleChannel);
		}
		if (staleConnection) {
			await safeClose(staleConnection);
		}
	};

	return { publish, close };
};
