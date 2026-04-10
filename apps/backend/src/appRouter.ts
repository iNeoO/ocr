import type { AuthService, FilesService, ProcessService } from "@ocr/services";
import { AuthRouterBuilder } from "./feature/auth/auth.router.js";
import { FilesRouterBuilder } from "./feature/files/files.router.js";
import { ProcessesRouterBuilder } from "./feature/processes/processes.router.js";
import { loggedProcedure, router } from "./trpc.js";

export class AppRouterBuilder {
	private authService: AuthService;
	private processesService: ProcessService;
	private filesService: FilesService;
	constructor(
		authService: AuthService,
		processesService: ProcessService,
		filesService: FilesService,
	) {
		this.authService = authService;
		this.processesService = processesService;
		this.filesService = filesService;
	}

	create() {
		return router({
			auth: new AuthRouterBuilder(this.authService).create(),
			health: loggedProcedure.query(() => ({ status: "ok" })),
			files: new FilesRouterBuilder(
				this.filesService,
				this.processesService,
			).create(),
			processes: new ProcessesRouterBuilder(this.processesService).create(),
		});
	}
}

export type AppRouter = ReturnType<AppRouterBuilder["create"]>;
