export function getErrorMessage(error: unknown, fallbackMessage: string) {
	return error instanceof Error && error.message
		? error.message
		: fallbackMessage;
}

export async function withServerErrorLogging<T>(
	operation: string,
	handler: () => Promise<T>,
	options?: {
		userMessage?: string;
	},
) {
	try {
		return await handler();
	} catch (error) {
		console.error("[SERVER ERROR]:", {
			operation,
			error: getErrorMessage(error, "Unknown server error"),
			stack: error instanceof Error ? error.stack : undefined,
			timestamp: new Date().toISOString(),
		});

		throw new Error(
			options?.userMessage ?? getErrorMessage(error, "Operation failed. Please try again."),
		);
	}
}
