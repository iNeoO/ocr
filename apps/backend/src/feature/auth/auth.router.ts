import type { Database } from "@ocr/db";
import { env } from "@ocr/infra/configs";
import type { RedisClient } from "@ocr/infra/redis";
import { AuthService, MailService } from "@ocr/services";

import { loggedProcedure } from "../../middlewares/logger.middleware.js";
import { router } from "../../trpc.js";
import {
	requestPasswordResetInput,
	resetPasswordInput,
	sendVerificationEmailInput,
	signInWithEmailAndPasswordInput,
	signUpWithEmailAndPasswordInput,
	verifyEmailInput,
} from "./auth.schema.js";
import { toHeaders } from "./helpers/headers.utils.js";

export class AuthRouterBuilder {
	private readonly authService: AuthService;

	constructor(db: Database, redis: RedisClient) {
		const mailService = new MailService({
			apiKey: env.RESEND_API_KEY,
			from: env.RESEND_FROM_EMAIL,
		});

		this.authService = new AuthService({
			db,
			redis,
			mailService,
			secret: env.BETTER_AUTH_SECRET,
			url: env.BETTER_AUTH_URL,
		});
	}

	create() {
		return router({
			signInWithEmailAndPassword: loggedProcedure
				.input(signInWithEmailAndPasswordInput)
				.mutation(({ input }) =>
					this.authService.signInWithEmailAndPassword(input),
				),
			signUpWithEmailAndPassword: loggedProcedure
				.input(signUpWithEmailAndPasswordInput)
				.mutation(({ input }) =>
					this.authService.signUpWithEmailAndPassword(input),
				),
			signOut: loggedProcedure.mutation(({ ctx }) =>
				this.authService.signOut({
					headers: toHeaders(ctx.req.headers),
				}),
			),
			getSession: loggedProcedure.query(({ ctx }) =>
				this.authService.getSession({
					headers: toHeaders(ctx.req.headers),
				}),
			),
			requestPasswordReset: loggedProcedure
				.input(requestPasswordResetInput)
				.mutation(({ input }) => this.authService.requestPasswordReset(input)),
			resetPassword: loggedProcedure
				.input(resetPasswordInput)
				.mutation(({ input }) => this.authService.resetPassword(input)),
			verifyEmail: loggedProcedure
				.input(verifyEmailInput)
				.mutation(({ input }) => this.authService.verifyEmail(input)),
			sendVerificationEmail: loggedProcedure
				.input(sendVerificationEmailInput)
				.mutation(({ input }) => this.authService.sendVerificationEmail(input)),
		});
	}
}

export type AuthRouter = ReturnType<AuthRouterBuilder["create"]>;
