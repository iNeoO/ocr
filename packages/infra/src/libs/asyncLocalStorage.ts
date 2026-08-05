import { AsyncLocalStorage } from "node:async_hooks";
import { APP_ERROR } from "@ocr/common";
import type { Logger } from "pino";
import { InternalError } from "../errors/internal-error.js";

export const loggerStorage = new AsyncLocalStorage<Logger>();

export const getLoggerStore = () => {
	const logger = loggerStorage.getStore();
	if (!logger) {
		throw new InternalError({
			code: APP_ERROR.LOGGER_STORE_MISSING,
			message: "Logger not found in AsyncLocalStorage",
		});
	}
	return logger;
};
