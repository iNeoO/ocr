import { z } from "zod";

export const postProcessPageJobDataSchema = z.object({
	pageId: z.uuid(),
});

export type PostProcessPageJobData = z.infer<
	typeof postProcessPageJobDataSchema
>;

export const parseRawMessage = (data: Buffer) => {
	const raw = JSON.parse(data.toString("utf-8"));
	return postProcessPageJobDataSchema.parse(raw);
};
