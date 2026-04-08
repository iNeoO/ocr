import type { ServerResponse } from "node:http";

export const toHeaders = (
	headers: Record<string, string | string[] | undefined>,
) => {
	const normalizedHeaders = new Headers();

	for (const [key, value] of Object.entries(headers)) {
		if (Array.isArray(value)) {
			for (const entry of value) {
				normalizedHeaders.append(key, entry);
			}
			continue;
		}

		if (value) {
			normalizedHeaders.set(key, value);
		}
	}

	return normalizedHeaders;
};

export const getSetCookieHeaders = (headers: Headers) => {
	if (typeof headers.getSetCookie === "function") {
		return headers.getSetCookie();
	}

	const setCookie = headers.get("set-cookie");
	return setCookie ? [setCookie] : [];
};

export const setResponseCookies = (res: ServerResponse, headers: Headers) => {
	const setCookies = getSetCookieHeaders(headers);

	if (setCookies.length > 0) {
		res.setHeader("set-cookie", setCookies);
	}
};

export const mergeSetCookieHeadersIntoRequestHeaders = (
	requestHeaders: Record<string, string | string[] | undefined>,
	responseHeaders: Headers,
) => {
	const headers = toHeaders(requestHeaders);
	const cookies = getSetCookieHeaders(responseHeaders)
		.map((cookie) => cookie.split(";")[0]?.trim())
		.filter((cookie): cookie is string => Boolean(cookie));

	if (cookies.length > 0) {
		headers.set("cookie", cookies.join("; "));
	}

	return headers;
};
