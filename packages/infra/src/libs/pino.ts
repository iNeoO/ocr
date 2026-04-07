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

type HttpLogBindings = {
	reqId: string;
	trpc: {
		path: string;
		type: string;
	};
	userAgent: string;
};

export const createHttpLogger = (bindings: HttpLogBindings) =>
	pinoLogger.child(bindings);

export const logHttpCompletion = (
	logger: pino.Logger,
	status: number,
	responseTime: number,
) =>
	logger.info(
		{
			res: {
				status,
			},
			responseTime,
		},
		"Request completed",
	);
