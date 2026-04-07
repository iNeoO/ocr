import { Redis } from "ioredis";
import { env } from "../configs/env.js";
import { pinoLogger } from "../libs/pino.js";

export const redis = new Redis({
	host: env.REDIS_OCR_HOST,
	port: env.REDIS_OCR_PORT,
	...(env.REDIS_OCR_USERNAME && {
		username: env.REDIS_OCR_USERNAME,
	}),
	...(env.REDIS_OCR_PASSWORD && {
		password: env.REDIS_OCR_PASSWORD,
	}),
	retryStrategy: (t) => Math.min(200 * t, 2000),
	maxRetriesPerRequest: 1,
});

redis.on("error", (e) => pinoLogger.error({ err: e }, "[Redis] error"));
redis.on("connect", () => pinoLogger.info("[Redis] connect"));
redis.on("ready", () => pinoLogger.info("[Redis] ready"));
redis.on("reconnecting", () => pinoLogger.warn("[Redis] reconnecting"));

export const connectRedis = async () => {
	if (redis.status === "ready") {
		return redis;
	}

	const waitForReady = () =>
		new Promise<void>((resolve, reject) => {
			const onReady = () => {
				cleanup();
				resolve();
			};
			const onError = (error: unknown) => {
				cleanup();
				reject(error);
			};
			const cleanup = () => {
				redis.off("ready", onReady);
				redis.off("error", onError);
			};
			redis.once("ready", onReady);
			redis.once("error", onError);
		});

	if (redis.status === "connecting" || redis.status === "connect") {
		await waitForReady();
		return redis;
	}

	await redis.connect();
	return redis;
};

export type RedisClient = Redis;
