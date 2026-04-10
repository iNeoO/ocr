import { z } from "zod";

export const transcribeJpgJobDataSchema = z.object({
	pageId: z.string(),
});

export type TranscribeJpgJobData = z.infer<typeof transcribeJpgJobDataSchema>;

export const parseRawMessage = (raw: Buffer): TranscribeJpgJobData => {
	const data = JSON.parse(raw.toString("utf-8"));
	return transcribeJpgJobDataSchema.parse(data);
};
