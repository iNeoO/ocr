import { createServerFn } from "@tanstack/react-start";
import { withServerErrorLogging } from "../server/error-handling";
import { trpc } from "../trpc.server";

export const signInWithEmailAndPassword = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			email: string;
			password: string;
			callbackURL?: string;
			rememberMe?: boolean;
		}) => data,
	)
	.handler(async ({ data }) => {
		const res = await withServerErrorLogging(
			"auth.signInWithEmailAndPassword",
			() =>
				trpc.auth.signInWithEmailAndPassword.mutate({
					email: data.email,
					password: data.password,
					callbackURL: data.callbackURL,
					rememberMe: data.rememberMe,
				}),
		);

		return res;
	});

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
	await withServerErrorLogging("auth.signOut", () => trpc.auth.signOut.mutate(), {
		userMessage: "Sign out failed. Please try again.",
	});
});

export type AuthSession = Awaited<ReturnType<typeof getSession>>;

export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await withServerErrorLogging("auth.getSession", () =>
			trpc.auth.getSession.query(),
		);

		return session;
	},
);

export const signUpWithEmailAndPassword = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			email: string;
			password: string;
			name: string;
			image?: string;
			callbackURL?: string;
			rememberMe?: boolean;
		}) => data,
	)
	.handler(async ({ data }) => {
		const res = await withServerErrorLogging(
			"auth.signUpWithEmailAndPassword",
			() =>
				trpc.auth.signUpWithEmailAndPassword.mutate({
					name: data.name,
					email: data.email,
					password: data.password,
					image: data.image,
					callbackURL: data.callbackURL,
					rememberMe: data.rememberMe,
				}),
		);

		return res;
	});

export const requestPasswordReset = createServerFn({ method: "POST" })
	.inputValidator((data: { email: string; redirectTo?: string }) => data)
	.handler(async ({ data }) => {
		return withServerErrorLogging("auth.requestPasswordReset", () =>
			trpc.auth.requestPasswordReset.mutate({
				email: data.email,
				redirectTo: data.redirectTo,
			}),
		);
	});

export const resetPassword = createServerFn({ method: "POST" })
	.inputValidator((data: { newPassword: string; token?: string }) => data)
	.handler(async ({ data }) => {
		return withServerErrorLogging("auth.resetPassword", () =>
			trpc.auth.resetPassword.mutate({
				newPassword: data.newPassword,
				token: data.token,
			}),
		);
	});

export const verifyEmail = createServerFn({ method: "POST" })
	.inputValidator((data: { token: string; callbackURL?: string }) => data)
	.handler(async ({ data }) => {
		return withServerErrorLogging("auth.verifyEmail", () =>
			trpc.auth.verifyEmail.mutate({
				token: data.token,
				callbackURL: data.callbackURL,
			}),
		);
	});

export const sendVerificationEmail = createServerFn({ method: "POST" })
	.inputValidator((data: { email: string; callbackURL?: string }) => data)
	.handler(async ({ data }) => {
		return withServerErrorLogging("auth.sendVerificationEmail", () =>
			trpc.auth.sendVerificationEmail.mutate({
				email: data.email,
				callbackURL: data.callbackURL,
			}),
		);
	});
