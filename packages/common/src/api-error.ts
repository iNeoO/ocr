type APIErrorLike = Error & {
	status?: number | string;
	statusCode?: number;
	body?: {
		message?: string;
	};
};

export const isAPIError = (error: unknown): error is APIErrorLike => {
	if (!(error instanceof Error)) {
		return false;
	}

	const candidate = error as Partial<APIErrorLike>;

	return (
		typeof candidate.statusCode === "number" ||
		typeof candidate.status === "number" ||
		typeof candidate.status === "string" ||
		(typeof candidate.body === "object" &&
			candidate.body !== null &&
			typeof candidate.body.message === "string")
	);
};
