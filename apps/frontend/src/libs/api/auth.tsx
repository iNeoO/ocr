import { createServerFn } from "@tanstack/react-start";
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
		const res = await trpc.auth.signInWithEmailAndPassword.mutate({
			email: data.email,
			password: data.password,
			callbackURL: data.callbackURL,
			rememberMe: data.rememberMe,
		});

		return res;
	});

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
	await trpc.auth.signOut.mutate();
});

export type AuthSession = Awaited<ReturnType<typeof getSession>>;

export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await trpc.auth.getSession.query();
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
		const res = await trpc.auth.signUpWithEmailAndPassword.mutate({
			name: data.name,
			email: data.email,
			password: data.password,
			image: data.image,
			callbackURL: data.callbackURL,
			rememberMe: data.rememberMe,
		});
		return res;
	});

export const requestPasswordReset = createServerFn({ method: "POST" })
	.inputValidator((data: { email: string; redirectTo?: string }) => data)
	.handler(async ({ data }) => {
		return trpc.auth.requestPasswordReset.mutate({
			email: data.email,
			redirectTo: data.redirectTo,
		});
	});

export const resetPassword = createServerFn({ method: "POST" })
	.inputValidator((data: { newPassword: string; token?: string }) => data)
	.handler(async ({ data }) => {
		return trpc.auth.resetPassword.mutate({
			newPassword: data.newPassword,
			token: data.token,
		});
	});

export const verifyEmail = createServerFn({ method: "POST" })
	.inputValidator((data: { token: string; callbackURL?: string }) => data)
	.handler(async ({ data }) => {
		return trpc.auth.verifyEmail.mutate({
			token: data.token,
			callbackURL: data.callbackURL,
		});
	});

export const sendVerificationEmail = createServerFn({ method: "POST" })
	.inputValidator((data: { email: string; callbackURL?: string }) => data)
	.handler(async ({ data }) => {
		return trpc.auth.sendVerificationEmail.mutate({
			email: data.email,
			callbackURL: data.callbackURL,
		});
	});
