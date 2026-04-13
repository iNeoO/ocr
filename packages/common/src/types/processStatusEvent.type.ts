export type ProcessStatusStage =
	| "split_pdf"
	| "transcribe_page"
	| "post_process_page"
	| "process_completed"
	| "process_failed";

export type ProcessStatusEvent = {
	userId: string;
	processId: string;
	processName: string;
	sourceFileName: string;
	stage: ProcessStatusStage;
	status: "success" | "failed";
	durationMs: number;
	message: string;
	occurredAt: string;
};
