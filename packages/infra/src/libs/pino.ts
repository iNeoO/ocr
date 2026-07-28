import process from "node:process";
import pino from "pino";
import pretty from "pino-pretty";

export type { Logger } from "pino";

const createDefaultConfig = (): pino.LoggerOptions => {
	return {
		level: "info",
		serializers: {
			err: pino.stdSerializers.err,
		},
	};
};

const isProduction = process.env.NODE_ENV === "production";

export const pinoLogger = isProduction
	? pino(createDefaultConfig())
	: pino(createDefaultConfig(), pretty());
