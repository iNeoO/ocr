import type { Database } from "@ocr/db";
import type { RedisClient } from "@ocr/infra/redis";
import type { MailService } from "../mail/mail.service.js";

export type AuthServiceOptions = {
	db: Database;
	redis: RedisClient;
	mailService: MailService;
	secret?: string;
	url?: string;
};

export type SignInWithEmailAndPasswordInput = {
	email: string;
	password: string;
	callbackURL?: string;
	rememberMe?: boolean;
};

export type SignUpWithEmailAndPasswordInput = {
	name: string;
	email: string;
	password: string;
	image?: string;
	callbackURL?: string;
	rememberMe?: boolean;
};

export type SignOutInput = {
	headers: Headers;
};

export type GetSessionInput = {
	headers: Headers;
};

export type RequestPasswordResetInput = {
	email: string;
	redirectTo?: string;
};

export type ResetPasswordInput = {
	newPassword: string;
	token?: string;
};

export type VerifyEmailInput = {
	token: string;
	callbackURL?: string;
};

export type SendVerificationEmailInput = {
	email: string;
	callbackURL?: string;
};
