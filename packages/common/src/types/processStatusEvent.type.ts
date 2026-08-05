import { z } from "zod";

export const processStatusStageSchema = z.enum([
	"split_pdf",
	"transcribe_page",
	"post_process_page",
	"process_finalizing",
	"process_completed",
	"process_failed",
]);

export type ProcessStatusStage = z.infer<typeof processStatusStageSchema>;

export const processStatusEventSchema = z.object({
	userId: z.string(),
	processId: z.string(),
	processName: z.string(),
	sourceFileName: z.string(),
	stage: processStatusStageSchema,
	status: z.enum(["success", "failed"]),
	durationMs: z.number(),
	message: z.string(),
	occurredAt: z.string(),
});

export type ProcessStatusEvent = z.infer<typeof processStatusEventSchema>;
