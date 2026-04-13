import type { ProcessStatusEvent } from "@ocr/common";
import type { ProcessService, ProcessStatusPubSubService } from "@ocr/services";
import { createUnauthorizedError } from "../../helpers/errors.helpers.js";
import { loggedProtectedProcedure, router } from "../../trpc.js";
import { deleteProcessInput } from "./processes.schema.js";

export class ProcessesRouterBuilder {
	private readonly processService: ProcessService;
	private readonly processStatusPubSubService: ProcessStatusPubSubService;

	constructor(
		processService: ProcessService,
		processStatusPubSubService: ProcessStatusPubSubService,
	) {
		this.processService = processService;
		this.processStatusPubSubService = processStatusPubSubService;
	}

	create() {
		const processStatusPubSubService = this.processStatusPubSubService;

		return router({
			getProcesses: loggedProtectedProcedure.query(async ({ ctx }) => {
				const user = ctx.user;
				if (!user) {
					throw createUnauthorizedError();
				}
				const userId = user.id;
				ctx.logger.info({ userId }, "Get processes for user");
				const processes =
					await this.processService.getProcessesByUserId(userId);
				return { processes };
			}),
			delete: loggedProtectedProcedure
				.input(deleteProcessInput)
				.mutation(async ({ ctx, input }) => {
					const user = ctx.user;
					if (!user) {
						throw createUnauthorizedError();
					}
					const userId = user.id;
					ctx.logger.info(
						{ userId, processId: input.processId },
						"Delete process",
					);
					await this.processService.deleteProcess(input.processId, userId);
					return { success: true };
				}),
			status: loggedProtectedProcedure.subscription(async function* (opts) {
				const user = opts.ctx.user;
				if (!user) {
					throw createUnauthorizedError();
				}
				const userId = user.id;
				const queue: ProcessStatusEvent[] = [];
				let resume: (() => void) | null = null;
				const unsubscribe =
					await processStatusPubSubService.subscribeToUserProcessStatus(
						userId,
						(event: ProcessStatusEvent) => {
							queue.push(event);
							resume?.();
							resume = null;
						},
					);

				try {
					while (!opts.signal?.aborted) {
						if (queue.length === 0) {
							await new Promise<void>((resolve) => {
								resume = resolve;
								const onAbort = () => resolve();
								opts.signal?.addEventListener("abort", onAbort, {
									once: true,
								});
							});
						}

						while (queue.length > 0) {
							const nextEvent = queue.shift();
							if (nextEvent) {
								yield nextEvent;
							}
						}
					}
				} finally {
					await unsubscribe();
				}
			}),
		});
	}
}
