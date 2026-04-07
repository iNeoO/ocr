import { z } from "zod";

export const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	PG_OCR_DB: z.string(),
	PG_OCR_USER: z.string(),
	PG_OCR_PASSWORD: z.string(),
	PG_URL: z.url(),
	REDIS_OCR_PASSWORD: z.string(),
	REDIS_OCR_USERNAME: z.string().optional(),
	REDIS_OCR_HOST: z.string(),
	REDIS_OCR_PORT: z.coerce.number(),
	AMQP_URL: z.string(),
	MINIO_ROOT_USER: z.string(),
	MINIO_ROOT_PASSWORD: z.string(),
	BETTER_AUTH_SECRET: z.string().min(1),
	BETTER_AUTH_URL: z.url(),
	RESEND_API_KEY: z.string().min(1),
	RESEND_FROM_EMAIL: z.email(),
});

export const env = envSchema.parse(process.env);
