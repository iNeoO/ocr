import { isAPIError } from "@ocr/common";
import { TRPCError } from "@trpc/server";

const statusCodeToTrpcCode = {
	400: "BAD_REQUEST",
	401: "UNAUTHORIZED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	409: "CONFLICT",
	422: "UNPROCESSABLE_CONTENT",
	429: "TOO_MANY_REQUESTS",
	500: "INTERNAL_SERVER_ERROR",
} as const;

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

const getErrorField = (error: unknown, field: string) =>
	typeof error === "object" && error !== null
		? (error as Record<string, unknown>)[field]
		: undefined;

export const createUnauthorizedError = (message = "Unauthorized") =>
	new TRPCError({
		code: "UNAUTHORIZED",
		message,
	});

export const toTrpcError = (error: unknown) => {
	if (error instanceof TRPCError) {
		return error;
	}

	if (isAPIError(error)) {
		const normalizedStatusCode =
			typeof error.statusCode === "number"
				? error.statusCode
				: typeof error.status === "number"
					? error.status
					: typeof error.status === "string"
						? statusNameToStatusCode[
								error.status as keyof typeof statusNameToStatusCode
							]
						: undefined;

		return new TRPCError({
			code:
				(typeof normalizedStatusCode === "number"
					? statusCodeToTrpcCode[
							normalizedStatusCode as keyof typeof statusCodeToTrpcCode
						]
					: undefined) ?? "INTERNAL_SERVER_ERROR",
			message: error.message,
			cause: error,
		});
	}

	const maybeStatusCode = getErrorField(error, "statusCode");
	const maybeStatus = getErrorField(error, "status");
	const maybeBody = getErrorField(error, "body");
	const maybeMessage = getErrorField(error, "message");
	const message =
		typeof maybeBody === "object" &&
		maybeBody !== null &&
		"message" in maybeBody &&
		typeof maybeBody.message === "string"
			? maybeBody.message
			: typeof maybeMessage === "string"
				? maybeMessage
				: "Unexpected authentication error";
	const normalizedStatusCode =
		typeof maybeStatusCode === "number"
			? maybeStatusCode
			: typeof maybeStatus === "number"
				? maybeStatus
				: typeof maybeStatus === "string"
					? statusNameToStatusCode[
							maybeStatus as keyof typeof statusNameToStatusCode
						]
					: undefined;

	if (typeof normalizedStatusCode === "number") {
		return new TRPCError({
			code:
				statusCodeToTrpcCode[
					normalizedStatusCode as keyof typeof statusCodeToTrpcCode
				] ?? "INTERNAL_SERVER_ERROR",
			message,
			cause: error,
		});
	}

	return new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message,
		cause: error,
	});
};
