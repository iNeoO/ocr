import type { ProcessStatusEvent } from "@ocr/common";
import type { ProcessService, ProcessStatusPubSubService } from "@ocr/services";
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
				const userId = ctx.user.id;
				ctx.logger.info({ userId }, "Get processes for user");
				const processes =
					await this.processService.getProcessesByUserId(userId);
				return { processes };
			}),
			delete: loggedProtectedProcedure
				.input(deleteProcessInput)
				.mutation(async ({ ctx, input }) => {
					ctx.logger.info(
						{ userId: ctx.user.id, processId: input.processId },
						"Delete process",
					);
					await this.processService.deleteProcess(input.processId, ctx.user.id);
					return { success: true };
				}),
			status: loggedProtectedProcedure.subscription(async function* (opts) {
				const queue: ProcessStatusEvent[] = [];
				let resume: (() => void) | null = null;
				const unsubscribe =
					await processStatusPubSubService.subscribeToUserProcessStatus(
						opts.ctx.user.id,
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
