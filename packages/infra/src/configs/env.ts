import { z } from "zod";

const environmentAliases = {
	development: "dev",
	test: "test",
	production: "prod",
} as const;

export const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		PG_OCR_DB: z.string(),
		PG_OCR_USER: z.string(),
		PG_OCR_PASSWORD: z.string(),
		PG_URL: z.url(),
		REDIS_OCR_PASSWORD: z.string(),
		REDIS_OCR_USERNAME: z.string().optional(),
		REDIS_OCR_HOST: z.string(),
		REDIS_OCR_PORT: z.coerce.number(),
		AMQP_URL: z.string(),
		S3_ACCESS_KEY: z.string().min(1),
		S3_SECRET_KEY: z.string().min(1),
		S3_ENDPOINT: z.url(),
		S3_BUCKET: z.string().min(1),
		S3_REGION: z.string().min(1),
		S3_FORCE_PATH_STYLE: z.coerce.boolean(),
		BETTER_AUTH_SECRET: z.string().min(1),
		BETTER_AUTH_URL: z.url(),
		RESEND_API_KEY: z.string().min(1),
		RESEND_FROM_EMAIL: z.email(),
		AMQ_SPLIT_PDF_QUEUE: z.string().default("split-pdf-jobs"),
		AMQ_SPLIT_PDF_PREFETCH: z.coerce.number().default(5),
		AMQ_TRANSCRIBE_JPG_QUEUE: z.string().default("transcribe-jpg-jobs"),
		AMQ_TRANSCRIBE_JPG_PREFETCH: z.coerce.number().default(5),
		AMQ_POST_PROCESS_PAGE_QUEUE: z.string().default("post-process-page-jobs"),
		AMQ_POST_PROCESS_PAGE_PREFETCH: z.coerce.number().default(5),
		OPENAI_API_KEY: z.string(),
	})
	.transform((env) => {
		const redisKeyPrefix = `ocr:${environmentAliases[env.NODE_ENV]}:`;

		return {
			...env,
			REDIS_KEY_PREFIX: redisKeyPrefix,
			BETTER_AUTH_REDIS_KEY_PREFIX: `${redisKeyPrefix}better-auth:`,
		};
	});

export const env = envSchema.parse(process.env);
