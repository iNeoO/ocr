import type { FilesService, ProcessService } from "@ocr/services";
import { createUnauthorizedError } from "../../helpers/errors.helpers.js";
import { loggedProtectedProcedure, router } from "../../trpc.js";
import { uploadFileSchema } from "./files.schema.js";

export class FilesRouterBuilder {
	private readonly filesService: FilesService;
	private readonly processService: ProcessService;

	constructor(filesService: FilesService, processService: ProcessService) {
		this.filesService = filesService;
		this.processService = processService;
	}

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
					const user = ctx.user;
					if (!user) {
						throw createUnauthorizedError();
					}
					ctx.logger.info("Upload file");
					await this.processService.assertDailyProcessLimit(user.id);

					const file = await this.filesService.uploadFile(input.file);

					try {
						const process = await this.processService.createProcess({
							fileId: file.id,
							userId: user.id,
						});

						return { process };
					} catch (error) {
						await this.filesService.deleteFiles([file.id]);
						throw error;
					}
				}),
		});
	}
}
