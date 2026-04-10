export type UpdatePageStatusInput = {
	id: string;
	status: "pending" | "processing" | "completed" | "failed";
	error?: string | null;
	markdownFileId?: string | null;
};
