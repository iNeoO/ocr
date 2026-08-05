import { container } from "./container";
import { createUnauthorizedError } from "./errors";
import { getRequestHeadersAsHeaders } from "./headers";

export const requireUser = async () => {
	const session = await container.authService.getSession({
		headers: getRequestHeadersAsHeaders(),
	});

	if (!session?.user?.id) {
		throw createUnauthorizedError();
	}

	return session.user;
};
