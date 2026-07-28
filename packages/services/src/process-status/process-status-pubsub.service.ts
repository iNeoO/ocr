import { pinoLogger } from "@ocr/infra";
import type { RedisClient } from "@ocr/infra/redis";
import {
	type ProcessStatusEvent,
	processStatusEventSchema,
} from "./process-status.types.js";

export class ProcessStatusPubSubService {
	private readonly redis: RedisClient;
	private readonly keyPrefix: string;

	constructor(redis: RedisClient, keyPrefix: string) {
		this.redis = redis;
		this.keyPrefix = keyPrefix;
	}

	getUserChannel(userId: string) {
		return `${this.keyPrefix}process-status:user:${userId}`;
	}

	async publishProcessStatusEvent(event: ProcessStatusEvent) {
		await this.redis.publish(
			this.getUserChannel(event.userId),
			JSON.stringify(event),
		);
	}

	async subscribeToUserProcessStatus(
		userId: string,
		onMessage: (event: ProcessStatusEvent) => void,
	) {
		const subscriber = this.redis.duplicate();
		const channel = this.getUserChannel(userId);

		subscriber.on("message", (messageChannel, payload) => {
			if (messageChannel !== channel) {
				return;
			}

			let parsedPayload: unknown;

			try {
				parsedPayload = JSON.parse(payload);
			} catch (error) {
				pinoLogger.error(
					{ err: error, channel },
					"Malformed process status event",
				);
				return;
			}

			const parsedEvent = processStatusEventSchema.safeParse(parsedPayload);
			if (!parsedEvent.success) {
				pinoLogger.error(
					{ err: parsedEvent.error, channel },
					"Unexpected process status event",
				);
				return;
			}

			onMessage(parsedEvent.data);
		});

		await subscriber.subscribe(channel);

		return async () => {
			await subscriber.unsubscribe(channel).catch(() => undefined);
			await subscriber.quit().catch(() => undefined);
		};
	}
}
