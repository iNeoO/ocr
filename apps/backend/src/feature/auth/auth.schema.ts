import { z } from "zod";

export const signInWithEmailAndPasswordInput = z.object({
	email: z.string().email(),
	password: z.string().min(1),
	callbackURL: z.string().optional(),
	rememberMe: z.boolean().optional(),
});

export const signUpWithEmailAndPasswordInput = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(1),
	image: z.string().optional(),
	callbackURL: z.string().optional(),
	rememberMe: z.boolean().optional(),
});

export const requestPasswordResetInput = z.object({
	email: z.string().email(),
	redirectTo: z.string().optional(),
});

export const resetPasswordInput = z.object({
	newPassword: z.string().min(1),
	token: z.string().optional(),
});

export const verifyEmailInput = z.object({
	token: z.string().min(1),
	callbackURL: z.string().optional(),
});

export const sendVerificationEmailInput = z.object({
	email: z.string().email(),
	callbackURL: z.string().optional(),
});
