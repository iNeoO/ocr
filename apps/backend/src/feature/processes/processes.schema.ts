import { z } from "zod";

export const deleteProcessInput = z.object({
	processId: z.uuid(),
});
