import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

const getSetCookieHeaders = (headers: Headers) => {
	if (typeof headers.getSetCookie === "function") {
		return headers.getSetCookie();
	}

	const setCookie = headers.get("set-cookie");
	return setCookie ? [setCookie] : [];
};

export const getRequestHeadersAsHeaders = () =>
	new Headers(getRequest().headers);

export const setResponseCookies = (authHeaders: Headers) => {
	const setCookies = getSetCookieHeaders(authHeaders);

	if (setCookies.length > 0) {
		setResponseHeader("set-cookie", setCookies);
	}
};

export const mergeSetCookieHeadersIntoRequestHeaders = (
	authHeaders: Headers,
) => {
	const headers = getRequestHeadersAsHeaders();
	const cookies = getSetCookieHeaders(authHeaders)
		.map((cookie) => cookie.split(";")[0]?.trim())
		.filter((cookie): cookie is string => Boolean(cookie));

	if (cookies.length > 0) {
		headers.set("cookie", cookies.join("; "));
	}

	return headers;
};
