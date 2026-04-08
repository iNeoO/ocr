import type { Database } from "@ocr/db";

export type ProcessServiceOptions = {
	db: Database;
};

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
		| "finalizing"
		| "completed"
		| "failed";
};
