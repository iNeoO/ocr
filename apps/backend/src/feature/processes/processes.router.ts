import type { ProcessService } from "@ocr/services";
import { loggedProtectedProcedure, router } from "../../trpc.js";
import { deleteProcessInput } from "./processes.schema.js";

export class ProcessesRouterBuilder {
	private readonly processesService: ProcessService;

	constructor(processesService: ProcessService) {
		this.processesService = processesService;
	}

	create() {
		return router({
			getProcesses: loggedProtectedProcedure.query(async ({ ctx }) => {
				const userId = ctx.user.id;
				ctx.logger.info({ userId }, "Get processes for user");
				const processes =
					await this.processesService.getProcessesByUserId(userId);
				return { processes };
			}),
			delete: loggedProtectedProcedure
				.input(deleteProcessInput)
				.mutation(async ({ ctx, input }) => {
					ctx.logger.info(
						{ userId: ctx.user.id, processId: input.processId },
						"Delete process",
					);
					await this.processesService.deleteProcess(
						input.processId,
						ctx.user.id,
					);
					return { success: true };
				}),
		});
	}
}
