import type { AuthService } from "@ocr/services";
import { AuthRouterBuilder } from "./feature/auth/auth.router.js";
import { FilesRouterBuilder } from "./feature/files/files.router.js";
import { loggedProcedure, router } from "./trpc.js";

export class AppRouterBuilder {
	private authService: AuthService;
	constructor(authService: AuthService) {
		this.authService = authService;
	}

	create() {
		return router({
			auth: new AuthRouterBuilder(this.authService).create(),
			health: loggedProcedure.query(() => ({ status: "ok" })),
			files: new FilesRouterBuilder().create(),
		});
	}
}

export type AppRouter = ReturnType<AppRouterBuilder["create"]>;
