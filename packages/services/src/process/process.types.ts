export type CreateProcessInput = {
	userId: string;
	fileId: string;
};

export type UpdateProcessStatusInput = {
	id: string;
	status:
		| "pending"
		| "splitting"
		| "processing"
		| "post_processing"
		| "finalizing"
		| "completed"
		| "failed";
	isRunning?: boolean;
};
