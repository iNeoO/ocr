import type { ProcessService } from "@ocr/services";
import { loggedProtectedProcedure, router } from "../../trpc.js";

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
		});
	}
}
