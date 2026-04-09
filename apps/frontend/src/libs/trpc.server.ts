import type { AppRouter } from "@ocr/backend/appRouter";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { createTRPCClient, httpLink } from "@trpc/client";

const getSetCookieHeaders = (headers: Headers) => {
	if (typeof headers.getSetCookie === "function") {
		return headers.getSetCookie();
	}

	const setCookie = headers.get("set-cookie");
	return setCookie ? [setCookie] : [];
};

const resolveServerUrl = (input: RequestInfo | URL): RequestInfo | URL => {
	if (typeof input !== "string" || !input.startsWith("/")) {
		return input;
	}

	const protocol = getRequestHeader("x-forwarded-proto") ?? "http";
	const host =
		getRequestHeader("x-forwarded-host") ?? getRequestHeader("host");

	if (!host) {
		throw new Error(
			"Cannot resolve relative tRPC URL on server: missing host header.",
		);
	}

	return new URL(input, `${protocol}://${host}`).toString();
};

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpLink({
			url: "/trpc",
			async fetch(url, options) {
				const cookie = getRequestHeader("cookie");
				const resolvedUrl = resolveServerUrl(url);

				const response = await fetch(resolvedUrl, {
					...options,
					headers: {
						...options?.headers,
						...(cookie ? { cookie } : {}),
					},
				});

				const setCookies = getSetCookieHeaders(response.headers);

				if (setCookies.length > 0) {
					setResponseHeader("set-cookie", setCookies);
				}

				return response;
			},
		}),
	],
});
