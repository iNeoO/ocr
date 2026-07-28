import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { container } from "../server/container";
import { withServerErrorLogging } from "../server/error-handling";
import {
	getRequestHeadersAsHeaders,
	mergeSetCookieHeadersIntoRequestHeaders,
	setResponseCookies,
} from "../server/headers";

const signInInput = z.object({
	email: z.email(),
	password: z.string().min(1),
	callbackURL: z.string().optional(),
	rememberMe: z.boolean().optional(),
});

const signUpInput = z.object({
	name: z.string().min(1),
	email: z.email(),
	password: z.string().min(1),
	image: z.string().optional(),
	callbackURL: z.string().optional(),
	rememberMe: z.boolean().optional(),
});

const requestPasswordResetInput = z.object({
	email: z.email(),
	redirectTo: z.string().optional(),
});

const resetPasswordInput = z.object({
	newPassword: z.string().min(1),
	token: z.string().optional(),
});

const verifyEmailInput = z.object({
	token: z.string().min(1),
	callbackURL: z.string().optional(),
});

const sendVerificationEmailInput = z.object({
	email: z.email(),
	callbackURL: z.string().optional(),
});

export const signInWithEmailAndPassword = createServerFn({ method: "POST" })
	.inputValidator(signInInput)
	.handler(({ data }) =>
		withServerErrorLogging("auth.signInWithEmailAndPassword", async () => {
			const { headers } =
				await container.authService.signInWithEmailAndPassword({
					email: data.email,
					password: data.password,
					callbackURL: data.callbackURL,
					rememberMe: data.rememberMe,
					headers: getRequestHeadersAsHeaders(),
				});

			setResponseCookies(headers);

			return container.authService.getSession({
				headers: mergeSetCookieHeadersIntoRequestHeaders(headers),
			});
		}),
	);

export const signUpWithEmailAndPassword = createServerFn({ method: "POST" })
	.inputValidator(signUpInput)
	.handler(({ data }) =>
		withServerErrorLogging("auth.signUpWithEmailAndPassword", async () => {
			const { headers } =
				await container.authService.signUpWithEmailAndPassword({
					name: data.name,
					email: data.email,
					password: data.password,
					image: data.image,
					callbackURL: data.callbackURL,
					rememberMe: data.rememberMe,
					headers: getRequestHeadersAsHeaders(),
				});

			setResponseCookies(headers);

			return container.authService.getSession({
				headers: mergeSetCookieHeadersIntoRequestHeaders(headers),
			});
		}),
	);

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
	await withServerErrorLogging(
		"auth.signOut",
		async () => {
			const { headers, response } = await container.authService.signOut({
				headers: getRequestHeadersAsHeaders(),
			});

			setResponseCookies(headers);

			return response;
		},
		{ userMessage: "Sign out failed. Please try again." },
	);
});

export const getSession = createServerFn({ method: "GET" }).handler(() =>
	withServerErrorLogging("auth.getSession", () =>
		container.authService.getSession({
			headers: getRequestHeadersAsHeaders(),
		}),
	),
);

export type AuthSession = Awaited<ReturnType<typeof getSession>>;

export const sessionQueryKey = ["auth", "session"] as const;

export const sessionQueryOptions = () =>
	queryOptions({
		queryKey: sessionQueryKey,
		queryFn: () => getSession(),
	});

export const requestPasswordReset = createServerFn({ method: "POST" })
	.inputValidator(requestPasswordResetInput)
	.handler(({ data }) =>
		withServerErrorLogging("auth.requestPasswordReset", () =>
			container.authService.requestPasswordReset({
				email: data.email,
				redirectTo: data.redirectTo,
			}),
		),
	);

export const resetPassword = createServerFn({ method: "POST" })
	.inputValidator(resetPasswordInput)
	.handler(({ data }) =>
		withServerErrorLogging("auth.resetPassword", () =>
			container.authService.resetPassword({
				newPassword: data.newPassword,
				token: data.token,
			}),
		),
	);

export const verifyEmail = createServerFn({ method: "POST" })
	.inputValidator(verifyEmailInput)
	.handler(({ data }) =>
		withServerErrorLogging("auth.verifyEmail", () =>
			container.authService.verifyEmail({
				token: data.token,
				callbackURL: data.callbackURL,
			}),
		),
	);

export const sendVerificationEmail = createServerFn({ method: "POST" })
	.inputValidator(sendVerificationEmailInput)
	.handler(({ data }) =>
		withServerErrorLogging("auth.sendVerificationEmail", () =>
			container.authService.sendVerificationEmail({
				email: data.email,
				callbackURL: data.callbackURL,
			}),
		),
	);
