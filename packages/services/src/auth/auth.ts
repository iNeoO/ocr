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
			sendOnSignUp: true,
			sendOnSignIn: true,
			sendVerificationEmail: ({ user, url: verificationUrl, token }) => {
				const frontendVerificationUrl = (() => {
					try {
						const sourceUrl = new URL(verificationUrl);
						const targetUrl = new URL("/validate-email", url ?? verificationUrl);
						targetUrl.searchParams.set(
							"token",
							token ?? sourceUrl.searchParams.get("token") ?? "",
						);

						const callbackURL = sourceUrl.searchParams.get("callbackURL");
						if (callbackURL) {
							targetUrl.searchParams.set("callbackURL", callbackURL);
						}

						return targetUrl.toString();
					} catch {
						return verificationUrl;
					}
				})();

				return mailService.sendVerificationEmail({
					to: user.email,
					name: user.name,
					url: frontendVerificationUrl,
				});
			},
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
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
