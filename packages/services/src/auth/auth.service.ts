import type { Database } from "@ocr/db";
import { env } from "@ocr/infra/configs";
import type { RedisClient } from "@ocr/infra/redis";
import type { MailService } from "../mail/mail.service.js";
import { type AppAuth, createAuth } from "./auth.js";

export { APIError, isAPIError } from "better-auth/api";

import type {
	AuthServiceOptions,
	GetSessionInput,
	RequestPasswordResetInput,
	ResetPasswordInput,
	SendVerificationEmailInput,
	SignInWithEmailAndPasswordInput,
	SignOutInput,
	SignUpWithEmailAndPasswordInput,
	VerifyEmailInput,
} from "./auth.types.js";

export class AuthService {
	readonly db: Database;
	readonly redis: RedisClient;
	readonly mailService: MailService;
	private readonly auth: AppAuth;

	constructor({ db, redis, mailService }: AuthServiceOptions) {
		this.db = db;
		this.redis = redis;
		this.mailService = mailService;
		this.auth = createAuth({
			db: this.db,
			redis: this.redis,
			mailService: this.mailService,
			secret: env.BETTER_AUTH_SECRET,
			url: env.FRONTEND_URL,
		});
	}

	signInWithEmailAndPassword({
		email,
		password,
		callbackURL,
		rememberMe,
		headers,
	}: SignInWithEmailAndPasswordInput) {
		return this.auth.api.signInEmail({
			...(headers ? { headers } : {}),
			returnHeaders: true,
			body: {
				email,
				password,
				callbackURL,
				rememberMe,
			},
		});
	}

	signUpWithEmailAndPassword({
		name,
		email,
		password,
		image,
		callbackURL,
		rememberMe,
		headers,
	}: SignUpWithEmailAndPasswordInput) {
		return this.auth.api.signUpEmail({
			...(headers ? { headers } : {}),
			returnHeaders: true,
			body: {
				name,
				email,
				password,
				image,
				callbackURL,
				rememberMe,
			},
		});
	}

	signOut({ headers }: SignOutInput) {
		return this.auth.api.signOut({
			returnHeaders: true,
			headers,
		});
	}

	getSession({ headers }: GetSessionInput) {
		return this.auth.api.getSession({
			headers,
		});
	}

	requestPasswordReset({ email, redirectTo }: RequestPasswordResetInput) {
		return this.auth.api.requestPasswordReset({
			body: {
				email,
				redirectTo,
			},
		});
	}

	resetPassword({ newPassword, token }: ResetPasswordInput) {
		return this.auth.api.resetPassword({
			body: {
				newPassword,
				token,
			},
		});
	}

	verifyEmail({ token, callbackURL }: VerifyEmailInput) {
		return this.auth.api.verifyEmail({
			query: {
				token,
				callbackURL,
			},
		});
	}

	sendVerificationEmail({ email, callbackURL }: SendVerificationEmailInput) {
		return this.auth.api.sendVerificationEmail({
			body: {
				email,
				callbackURL,
			},
		});
	}
}
