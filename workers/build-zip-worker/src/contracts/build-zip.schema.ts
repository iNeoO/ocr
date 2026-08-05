import { z } from "zod";

export const buildZipJobDataSchema = z.object({
	processId: z.string(),
});

export type BuildZipJobData = z.infer<typeof buildZipJobDataSchema>;

export const parseRawMessage = (raw: Buffer): BuildZipJobData => {
	const data = JSON.parse(raw.toString("utf-8"));
	return buildZipJobDataSchema.parse(data);
};
