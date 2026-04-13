export type UpdatePageStatusInput = {
	id: string;
	status: "pending" | "processing" | "post_processing" | "completed" | "failed";
	error?: string | null;
	markdownFileId?: string | null;
};
