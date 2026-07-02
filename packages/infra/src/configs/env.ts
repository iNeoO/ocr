import { z } from "zod";

export const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		BACKEND_PORT: z.coerce.number(),
		PG_OCR_DB: z.string(),
		PG_OCR_USER: z.string(),
		PG_OCR_PASSWORD: z.string(),
		PG_URL: z.url(),
		REDIS_OCR_PASSWORD: z.string(),
		REDIS_OCR_USERNAME: z.string().optional(),
		REDIS_OCR_HOST: z.string(),
		REDIS_OCR_PORT: z.coerce.number(),
		AMQP_URL: z.string(),
		S3_ACCESS_KEY: z.string().optional(),
		S3_SECRET_KEY: z.string().optional(),
		S3_ENDPOINT: z.url().optional(),
		S3_BUCKET: z.string().optional(),
		S3_REGION: z.string().optional(),
		S3_FORCE_PATH_STYLE: z.coerce.boolean().optional(),
		MINIO_ROOT_USER: z.string().optional(),
		MINIO_ROOT_PASSWORD: z.string().optional(),
		MINIO_ENDPOINT: z.url().optional(),
		MINIO_BUCKET: z.string().optional(),
		MINIO_REGION: z.string().optional(),
		MINIO_FORCE_PATH_STYLE: z.coerce.boolean().optional(),
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
		const accessKey = env.S3_ACCESS_KEY ?? env.MINIO_ROOT_USER;
		const secretKey = env.S3_SECRET_KEY ?? env.MINIO_ROOT_PASSWORD;

		if (!accessKey || !secretKey) {
			throw new Error("S3_ACCESS_KEY and S3_SECRET_KEY must be set");
		}

		return {
			...env,
			S3_ACCESS_KEY: accessKey,
			S3_SECRET_KEY: secretKey,
			S3_ENDPOINT:
				env.S3_ENDPOINT ?? env.MINIO_ENDPOINT ?? "http://localhost:3900",
			S3_BUCKET: env.S3_BUCKET ?? env.MINIO_BUCKET ?? "ocr-dev",
			S3_REGION: env.S3_REGION ?? env.MINIO_REGION ?? "us-east-1",
			S3_FORCE_PATH_STYLE:
				env.S3_FORCE_PATH_STYLE ?? env.MINIO_FORCE_PATH_STYLE ?? true,
		};
	});

export const env = envSchema.parse(process.env);
