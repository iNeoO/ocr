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
