import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "@ocr/infra/libs";
import {
	createHttpLogger,
	loggerStorage,
	logHttpCompletion,
} from "@ocr/infra/libs";
import type { AuthService } from "@ocr/services";
import { initTRPC } from "@trpc/server";
import type { NodeHTTPCreateContextFnOptions } from "@trpc/server/adapters/node-http";
import { ZodError, z } from "zod";
import { createUnauthorizedError } from "./helpers/errors.helpers.js";
import { toHeaders } from "./helpers/headers.helpers.js";
import { observeTrpcRequest, trackTrpcSubscription } from "./metrics.js";

const UNKNOWN_VALUE = "unknown";

export type Context = {
	req: IncomingMessage;
	res: ServerResponse;
	logger: Logger;
	user:
		| NonNullable<Awaited<ReturnType<AuthService["getSession"]>>>["user"]
		| undefined;
};

export class ContextBuilder {
	private authService: AuthService;
	constructor(authService: AuthService) {
		this.authService = authService;
	}

	create(): (
		opts: NodeHTTPCreateContextFnOptions<IncomingMessage, ServerResponse>,
	) => Promise<Context> {
		return async ({
			req,
			res,
		}: NodeHTTPCreateContextFnOptions<IncomingMessage, ServerResponse>) => {
			const authSession = await this.authService.getSession({
				headers: toHeaders(req.headers),
			});

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
				user: authSession?.user,
			};
		};
	}
}

const t = initTRPC.context<Context>().create({
	errorFormatter(opts) {
		return {
			...opts.shape,
			data: {
				zodError:
					opts.error.code === "BAD_REQUEST" &&
					opts.error.cause instanceof ZodError
						? z.treeifyError(opts.error.cause)
						: null,
				...opts.shape.data,
			},
		};
	},
});

export const router: typeof t.router = t.router;
export const publicProcedure: typeof t.procedure = t.procedure;

export const loggedProcedure: typeof publicProcedure = publicProcedure.use(
	async (opts) => {
		const startedAt = Date.now();
		let result: "success" | "error" = "success";
		const logger = opts.ctx.logger.child({
			trpc: {
				path: opts.path || UNKNOWN_VALUE,
				type: opts.type || UNKNOWN_VALUE,
			},
		});

		return loggerStorage.run(logger, async () => {
			try {
				const nextResult = await opts.next({
					ctx: {
						...opts.ctx,
						logger,
					},
				});
				if (opts.type === "subscription") {
					const endSubscriptionMetric = trackTrpcSubscription(
						opts.path || UNKNOWN_VALUE,
					);
					opts.signal?.addEventListener("abort", endSubscriptionMetric, {
						once: true,
					});
				}
				return nextResult;
			} catch (error) {
				result = "error";
				logger.error(
					{
						err: error,
					},
					"tRPC request failed",
				);
				throw error;
			} finally {
				const durationMs = Date.now() - startedAt;
				observeTrpcRequest({
					procedure: opts.path || UNKNOWN_VALUE,
					type: opts.type || UNKNOWN_VALUE,
					statusCode: opts.ctx.res.statusCode,
					durationMs,
					result,
				});
				logHttpCompletion(logger, opts.ctx.res.statusCode, durationMs);
			}
		});
	},
);

export const loggedProtectedProcedure: typeof loggedProcedure =
	loggedProcedure.use(({ ctx, next }) => {
		if (!ctx.user?.id) {
			throw createUnauthorizedError();
		}
		return next({
			ctx: {
				...ctx,
				user: ctx.user,
			},
		});
	});
