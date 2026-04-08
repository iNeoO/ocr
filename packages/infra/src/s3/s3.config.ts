import { env } from "../configs/env.js";

export const s3Config = {
	endpoint: env.MINIO_ENDPOINT,
	bucket: env.MINIO_BUCKET,
	region: env.MINIO_REGION,
	forcePathStyle: env.MINIO_FORCE_PATH_STYLE,
	credentials: {
		accessKeyId: env.MINIO_ROOT_USER,
		secretAccessKey: env.MINIO_ROOT_PASSWORD,
	},
} as const;
