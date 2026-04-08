import type { AppRouter } from "@ocr/backend/appRouter";
import { createTRPCClient, httpLink } from "@trpc/client";

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpLink({
			url: "http://localhost:3000",
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
		}),
	],
});

const a = new FormData();
a.append("file", new Blob(["Hello, world!"], { type: "text/plain" }));

trpc.files.upload.mutate(a);
