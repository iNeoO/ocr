import { APP_ERROR, type AppErrorCode, isAPIError } from "@ocr/common";
import { isInternalError } from "@ocr/infra/errors";

/**
 * The HTTP meaning of each of our error codes. Exhaustive on purpose: a new
 * code in `APP_ERROR` does not compile until it is given a status here, which
 * is also the decision of whether its message may reach the browser — only
 * 4xx messages are passed through (see `withServerErrorLogging`).
 */
const appErrorStatusCode: Record<AppErrorCode, number> = {
	[APP_ERROR.PROCESS_DAILY_LIMIT_REACHED]: 429,
	[APP_ERROR.PROCESS_NOT_FOUND]: 404,
	[APP_ERROR.PROCESS_NOT_COMPLETED]: 409,
	[APP_ERROR.PROCESS_NOT_DELETABLE]: 409,
	[APP_ERROR.PROCESS_OUTPUT_INCOMPLETE]: 409,
	[APP_ERROR.PROCESS_SOURCE_FILE_NOT_FOUND]: 404,
	[APP_ERROR.FILE_NOT_FOUND]: 404,
	// Every code below is an inconsistent state or a missing dependency, never
	// something the user did: internal, generic message.
	[APP_ERROR.FILE_CONTENT_NOT_FOUND]: 500,
	[APP_ERROR.FILE_PDF_SPLIT_FAILED]: 500,
	[APP_ERROR.PAGE_NOT_FOUND]: 500,
	[APP_ERROR.PAGE_IMAGE_FILE_MISSING]: 500,
	[APP_ERROR.PAGE_IMAGE_FILE_NOT_FOUND]: 500,
	[APP_ERROR.PAGE_MARKDOWN_FILE_MISSING]: 500,
	[APP_ERROR.LLM_SERVICE_NOT_CONFIGURED]: 500,
	[APP_ERROR.LOGGER_STORE_MISSING]: 500,
	[APP_ERROR.AMQP_CONSUMER_SETUP_FAILED]: 500,
};

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

	// Our own errors: the code decides the status, not a message or a guess.
	if (isInternalError(error)) {
		return new ServerError(
			error.message,
			appErrorStatusCode[error.code] ?? DEFAULT_STATUS_CODE,
			{ cause: error },
		);
	}

	// Only `better-auth` reaches this: it throws its own `APIError`, which
	// carries the status in a shape we have to sniff.
	const message = isAPIError(error)
		? error.message || normalizeMessage(error) || DEFAULT_MESSAGE
		: (normalizeMessage(error) ?? DEFAULT_MESSAGE);

	return new ServerError(
		message,
		normalizeStatusCode(error) ?? DEFAULT_STATUS_CODE,
		{ cause: error },
	);
};
