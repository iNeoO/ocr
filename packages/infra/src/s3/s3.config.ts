import { env } from "../configs/env.js";

export const s3Config = {
	endpoint: env.S3_ENDPOINT,
	bucket: env.S3_BUCKET,
	region: env.S3_REGION,
	forcePathStyle: env.S3_FORCE_PATH_STYLE,
	credentials: {
		accessKeyId: env.S3_ACCESS_KEY,
		secretAccessKey: env.S3_SECRET_KEY,
	},
} as const;
