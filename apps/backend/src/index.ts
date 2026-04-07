import { db } from "@ocr/db";
import { redis } from "@ocr/infra/redis";
import { createHTTPServer } from "@trpc/server/adapters/standalone";

import { AppRouterBuilder } from "./appRouter.js";
import { createContext } from "./trpc.js";

const appRouter = new AppRouterBuilder(db, redis).create();

const server = createHTTPServer({
	router: appRouter,
	createContext,
});

server.listen(3000);
