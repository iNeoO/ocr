import type { Database } from "@ocr/db";
import type { RedisClient } from "@ocr/infra/redis";

import { AuthRouterBuilder } from "./feature/auth/auth.router.js";
import { router } from "./trpc.js";

export class AppRouterBuilder {
	constructor(
		private readonly db: Database,
		private readonly redis: RedisClient,
	) {}

	create() {
		return router({
			auth: new AuthRouterBuilder(this.db, this.redis).create(),
		});
	}
}

export type AppRouter = ReturnType<AppRouterBuilder["create"]>;
