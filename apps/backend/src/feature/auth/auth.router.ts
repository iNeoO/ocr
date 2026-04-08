import type { AuthService } from "@ocr/services";
import { toTrpcError } from "../../helpers/errors.helpers.js";
import {
	mergeSetCookieHeadersIntoRequestHeaders,
	setResponseCookies,
	toHeaders,
} from "../../helpers/headers.helpers.js";
import { loggedProcedure, router } from "../../trpc.js";
import {
	requestPasswordResetInput,
	resetPasswordInput,
	sendVerificationEmailInput,
	signInWithEmailAndPasswordInput,
	signUpWithEmailAndPasswordInput,
	verifyEmailInput,
} from "./auth.schema.js";

const handleAuthError = (error: unknown): never => {
	throw toTrpcError(error);
};

const runAuthAction = async <T>(action: () => Promise<T>) => {
	try {
		return await action();
	} catch (error) {
		handleAuthError(error);
	}
};

export class AuthRouterBuilder {
	private readonly authService: AuthService;

	constructor(authService: AuthService) {
		this.authService = authService;
	}

	create() {
		return router({
			signInWithEmailAndPassword: loggedProcedure
				.input(signInWithEmailAndPasswordInput)
				.mutation(({ ctx, input }) =>
					runAuthAction(async () => {
						const { headers } =
							await this.authService.signInWithEmailAndPassword({
								...input,
								headers: toHeaders(ctx.req.headers),
							});

						setResponseCookies(ctx.res, headers);

						return this.authService.getSession({
							headers: mergeSetCookieHeadersIntoRequestHeaders(
								ctx.req.headers,
								headers,
							),
						});
					}),
				),
			signUpWithEmailAndPassword: loggedProcedure
				.input(signUpWithEmailAndPasswordInput)
				.mutation(({ ctx, input }) =>
					runAuthAction(async () => {
						const { headers } =
							await this.authService.signUpWithEmailAndPassword({
								...input,
								headers: toHeaders(ctx.req.headers),
							});

						setResponseCookies(ctx.res, headers);

						return this.authService.getSession({
							headers: mergeSetCookieHeadersIntoRequestHeaders(
								ctx.req.headers,
								headers,
							),
						});
					}),
				),
			signOut: loggedProcedure.mutation(({ ctx }) =>
				runAuthAction(async () => {
					const { headers, response } = await this.authService.signOut({
						headers: toHeaders(ctx.req.headers),
					});

					setResponseCookies(ctx.res, headers);

					return response;
				}),
			),
			getSession: loggedProcedure.query(({ ctx }) =>
				runAuthAction(() =>
					this.authService.getSession({
						headers: toHeaders(ctx.req.headers),
					}),
				),
			),
			requestPasswordReset: loggedProcedure
				.input(requestPasswordResetInput)
				.mutation(({ input }) =>
					runAuthAction(() => this.authService.requestPasswordReset(input)),
				),
			resetPassword: loggedProcedure
				.input(resetPasswordInput)
				.mutation(({ input }) =>
					runAuthAction(() => this.authService.resetPassword(input)),
				),
			verifyEmail: loggedProcedure
				.input(verifyEmailInput)
				.mutation(({ input }) =>
					runAuthAction(() => this.authService.verifyEmail(input)),
				),
			sendVerificationEmail: loggedProcedure
				.input(sendVerificationEmailInput)
				.mutation(({ input }) =>
					runAuthAction(() => this.authService.sendVerificationEmail(input)),
				),
		});
	}
}

export type AuthRouter = ReturnType<AuthRouterBuilder["create"]>;
