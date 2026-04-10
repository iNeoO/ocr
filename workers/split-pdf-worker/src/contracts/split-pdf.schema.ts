import { z } from "zod";

export const splitPdfJobDataSchema = z.object({
	processId: z.string(),
});

export type SplitPdfJobData = z.infer<typeof splitPdfJobDataSchema>;

export const parseRawMessage = (raw: Buffer): SplitPdfJobData => {
	const data = JSON.parse(raw.toString("utf-8"));
	return splitPdfJobDataSchema.parse(data);
};
