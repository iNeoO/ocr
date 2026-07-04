import type { RedisClient } from "@ocr/infra/redis";
import type { ProcessStatusEvent } from "./process-status.types.js";

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

			onMessage(JSON.parse(payload) as ProcessStatusEvent);
		});

		await subscriber.subscribe(channel);

		return async () => {
			await subscriber.unsubscribe(channel).catch(() => undefined);
			await subscriber.quit().catch(() => undefined);
		};
	}
}
