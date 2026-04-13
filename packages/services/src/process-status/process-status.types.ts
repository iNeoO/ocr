import type { ProcessStatusEvent, ProcessStatusStage } from "@ocr/common";

export type { ProcessStatusEvent, ProcessStatusStage };

export type PublishProcessStatusEventInput = {
	processId: string;
	stage: ProcessStatusStage;
	status: ProcessStatusEvent["status"];
	durationMs: number;
	message: string;
};

export type ProcessNotificationContext = {
	userId: string;
	processId: string;
	processName: string;
	sourceFileName: string;
};
