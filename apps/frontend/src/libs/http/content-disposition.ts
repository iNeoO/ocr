const NON_ASCII_OR_CONTROL = /[^\x20-\x7E]+/g;
const REPEATED_DASHES = /-+/g;

const encodeRFC5987ValueChars = (value: string) =>
	encodeURIComponent(value).replace(
		/['()*]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
	);

const toAsciiFilename = (filename: string) => {
	const normalized = filename.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	const ascii = normalized
		.replace(NON_ASCII_OR_CONTROL, "-")
		.replace(REPEATED_DASHES, "-")
		.replace(/(^[-.\s]+|[-.\s]+$)/g, "");

	return ascii || "download";
};

const escapeQuotedString = (value: string) => value.replace(/["\\]/g, "\\$&");

export const buildContentDispositionAttachment = (filename: string) => {
	const fallback = escapeQuotedString(toAsciiFilename(filename));
	const encoded = encodeRFC5987ValueChars(filename);
	return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
};

export const parseContentDispositionFilename = (value: string | null) => {
	if (!value) {
		return null;
	}

	const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf8Match) {
		try {
			return decodeURIComponent(utf8Match[1]);
		} catch {
			// Fall through to the plain filename parser.
		}
	}

	const quotedMatch = value.match(/filename="((?:\\.|[^"])*)"/i);
	if (quotedMatch) {
		return quotedMatch[1].replace(/\\(["\\])/g, "$1");
	}

	const bareMatch = value.match(/filename=([^;]+)/i);
	return bareMatch?.[1]?.trim() ?? null;
};
