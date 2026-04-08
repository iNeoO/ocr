import { loggedProtectedProcedure, router } from "../../trpc.js";
import { uploadFileSchema } from "./files.schema.js";

export class FilesRouterBuilder {
	create() {
		return router({
			upload: loggedProtectedProcedure
				.meta({
					openapi: {
						method: "POST",
						path: "/upload",
						type: "multipart/form-data",
					},
				})
				.input(uploadFileSchema)
				.mutation(async ({ ctx, input }) => {
					ctx.logger.info("Upload file");
					return { message: "File uploaded successfully" };
				}),
			test: loggedProtectedProcedure.query(async ({ ctx }) => {
				ctx.logger.info("Test file route");
				return { message: "File route is working" };
			}),
		});
	}
}
