import { z } from "zod";

export const envSchema = z.object({
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
	MINIO_ROOT_USER: z.string(),
	MINIO_ROOT_PASSWORD: z.string(),
	MINIO_ENDPOINT: z.url().default("http://localhost:9000"),
	MINIO_BUCKET: z.string().default("ocr"),
	MINIO_REGION: z.string().default("us-east-1"),
	MINIO_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
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
	LLM_URL: z.url(),
	LLM_MODEL: z.string().default("qwen2.5vl:7b"),
	LLM_TIMEOUT_MS: z.coerce.number().default(900000),
});

export const env = envSchema.parse(process.env);
