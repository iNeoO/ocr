import { loggerStorage, logHttpCompletion } from "@ocr/infra/libs";

import { publicProcedure } from "../trpc.js";

const UNKNOWN_VALUE = "unknown";

export const loggedProcedure = publicProcedure.use(async (opts) => {
	const startedAt = Date.now();
	const logger = opts.ctx.logger.child({
		trpc: {
			path: opts.path || UNKNOWN_VALUE,
			type: opts.type || UNKNOWN_VALUE,
		},
	});

	return loggerStorage.run(logger, async () => {
		try {
			return await opts.next({
				ctx: {
					...opts.ctx,
					logger,
				},
			});
		} finally {
			const durationMs = Date.now() - startedAt;
			logHttpCompletion(logger, opts.ctx.res.statusCode, durationMs);
		}
	});
});
