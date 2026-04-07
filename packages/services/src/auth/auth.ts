import { redisStorage } from "@better-auth/redis-storage";
import { type Database, schema } from "@ocr/db";
import type { RedisClient } from "@ocr/infra/redis";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { MailService } from "../mail/mail.service.js";

export type CreateAuthOptions = {
	db: Database;
	redis: RedisClient;
	mailService: MailService;
	secret?: string;
	url?: string;
};

export const createAuth = ({
	db,
	redis,
	mailService,
	secret,
	url,
}: CreateAuthOptions) =>
	betterAuth({
		...(secret ? { secret } : {}),
		...(url ? { url } : {}),
		emailVerification: {
			sendVerificationEmail: ({ user, url: verificationUrl }) =>
				mailService.sendVerificationEmail({
					to: user.email,
					name: user.name,
					url: verificationUrl,
				}),
		},
		emailAndPassword: {
			enabled: true,
			sendResetPassword: ({ user, url: resetPasswordUrl }) =>
				mailService.sendResetPasswordEmail({
					to: user.email,
					name: user.name,
					url: resetPasswordUrl,
				}),
		},
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		secondaryStorage: redisStorage({
			client: redis,
			keyPrefix: "better-auth:",
		}),
	});

export type AppAuth = ReturnType<typeof createAuth>;
