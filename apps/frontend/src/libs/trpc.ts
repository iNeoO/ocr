import type { AppRouter } from "@ocr/backend/appRouter";
import {
	createTRPCClient,
	httpLink,
	httpSubscriptionLink,
	splitLink,
} from "@trpc/client";

export const trpc = createTRPCClient<AppRouter>({
	links: [
		splitLink({
			condition(op) {
				return op.type === "subscription";
			},
			true: httpSubscriptionLink({
				url: "/trpc",
			}),
			false: httpLink({
				url: "/trpc",
				fetch(url, options) {
					return fetch(url, {
						...options,
						credentials: "include",
					});
				},
			}),
		}),
	],
});
