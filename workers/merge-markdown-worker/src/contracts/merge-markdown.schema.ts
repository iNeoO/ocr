import { z } from "zod";

export const mergeMarkdownJobDataSchema = z.object({
	processId: z.string(),
});

export type MergeMarkdownJobData = z.infer<typeof mergeMarkdownJobDataSchema>;

export const parseRawMessage = (raw: Buffer): MergeMarkdownJobData => {
	const data = JSON.parse(raw.toString("utf-8"));
	return mergeMarkdownJobDataSchema.parse(data);
};
