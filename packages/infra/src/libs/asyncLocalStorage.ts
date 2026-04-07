import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";

export const loggerStorage = new AsyncLocalStorage<Logger>();

export const getLoggerStore = () => {
	const logger = loggerStorage.getStore();
	if (!logger) {
		throw new Error("Logger not found in AsyncLocalStorage");
	}
	return logger;
};
