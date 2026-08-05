import { isAPIError } from "@ocr/common";

const statusNameToStatusCode = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
} as const;

const DEFAULT_STATUS_CODE = 500;
const DEFAULT_MESSAGE = "Unexpected server error";

const getErrorField = (error: unknown, field: string) =>
	typeof error === "object" && error !== null
		? (error as Record<string, unknown>)[field]
		: undefined;

const normalizeStatusCode = (error: unknown) => {
	const maybeStatusCode = getErrorField(error, "statusCode");
	if (typeof maybeStatusCode === "number") {
		return maybeStatusCode;
	}

	const maybeStatus = getErrorField(error, "status");
	if (typeof maybeStatus === "number") {
		return maybeStatus;
	}

	if (typeof maybeStatus === "string") {
		return statusNameToStatusCode[
			maybeStatus as keyof typeof statusNameToStatusCode
		];
	}

	return undefined;
};

const normalizeMessage = (error: unknown) => {
	const maybeBody = getErrorField(error, "body");
	if (
		typeof maybeBody === "object" &&
		maybeBody !== null &&
		"message" in maybeBody &&
		typeof (maybeBody as { message?: unknown }).message === "string" &&
		(maybeBody as { message: string }).message
	) {
		return (maybeBody as { message: string }).message;
	}

	const maybeMessage = getErrorField(error, "message");
	if (typeof maybeMessage === "string" && maybeMessage) {
		return maybeMessage;
	}

	return undefined;
};

export class ServerError extends Error {
	readonly statusCode: number;

	constructor(message: string, statusCode: number, options?: ErrorOptions) {
		super(message, options);
		this.name = "ServerError";
		this.statusCode = statusCode;
	}
}

export const createUnauthorizedError = (message = "Unauthorized") =>
	new ServerError(message, 401);

/**
 * Errors thrown out of a server function are serialized to the browser by
 * seroval, which walks `stack` and the whole `cause` chain — so everything
 * hanging off the error becomes public. Use this for the error that crosses
 * the boundary: it carries the message and the status code, nothing else.
 * Log the original error first; the diagnostic detail lives in the logs.
 */
export const createClientSafeError = (message: string, statusCode: number) => {
	const error = new ServerError(message, statusCode);
	delete error.stack;

	return error;
};

export const toServerError = (error: unknown): ServerError => {
	if (error instanceof ServerError) {
		return error;
	}

	const message = isAPIError(error)
		? error.message || normalizeMessage(error) || DEFAULT_MESSAGE
		: (normalizeMessage(error) ?? DEFAULT_MESSAGE);

	return new ServerError(
		message,
		normalizeStatusCode(error) ?? DEFAULT_STATUS_CODE,
		{ cause: error },
	);
};
