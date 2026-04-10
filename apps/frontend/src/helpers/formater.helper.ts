export const formatDate = (d: Date | null | string) => {
	if (!d) {
		return "—";
	}

	const date = typeof d === "string" ? new Date(d) : d;

	return new Intl.DateTimeFormat("fr-FR", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(date));
};
