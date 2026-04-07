import { randomUUID } from "node:crypto";

import type { CreateHTTPContextOptions } from "@trpc/server/adapters/standalone";
import { createHttpLogger } from "@ocr/infra/libs";
import { initTRPC } from "@trpc/server";

const UNKNOWN_VALUE = "unknown";

export const createContext = ({ req, res }: CreateHTTPContextOptions) => {
	const userAgent = Array.isArray(req.headers["user-agent"])
		? req.headers["user-agent"][0] || UNKNOWN_VALUE
		: req.headers["user-agent"] || UNKNOWN_VALUE;

	const logger = createHttpLogger({
		reqId: randomUUID(),
		trpc: {
			path: UNKNOWN_VALUE,
			type: UNKNOWN_VALUE,
		},
		userAgent,
	});

	return {
		req,
		res,
		logger,
	};
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
