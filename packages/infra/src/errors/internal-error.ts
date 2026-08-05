import type { AppErrorCode } from "@ocr/common";

type InternalErrorOptions = {
	code: AppErrorCode;
	message?: string;
	cause?: unknown;
};

/**
 * The only error our own code throws. `code` carries the identity, `message`
 * the human-readable text — for a 4xx that text reaches the browser, so write
 * it for the user. Anything thrown by a library (Drizzle, S3, AMQP) stays as
 * it is and lands on the generic 500 path.
 */
export class InternalError extends Error {
	readonly code: AppErrorCode;

	constructor({ code, message, cause }: InternalErrorOptions) {
		super(message ?? code, cause === undefined ? undefined : { cause });
		this.name = "InternalError";
		this.code = code;

		Object.setPrototypeOf(this, InternalError.prototype);
	}
}

/**
 * Structural rather than `instanceof`: the same error can be created in a
 * worker (plain Node ESM) and inspected in the web app (Vite server bundle),
 * and nothing guarantees both loaded the same module instance.
 */
export const isInternalError = (error: unknown): error is InternalError => {
	if (!(error instanceof Error)) {
		return false;
	}

	return (
		error.name === "InternalError" &&
		typeof (error as Partial<InternalError>).code === "string"
	);
};
