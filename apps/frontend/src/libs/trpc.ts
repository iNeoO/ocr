import type { AppRouter } from "@ocr/backend/appRouter";
import { createTRPCClient, httpLink } from "@trpc/client";

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpLink({
			url: "/trpc",
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
		}),
	],
});
