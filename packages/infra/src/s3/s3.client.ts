import { S3Client } from "@aws-sdk/client-s3";
import { s3Config } from "./s3.config.js";

export const s3 = new S3Client({
	endpoint: s3Config.endpoint,
	region: s3Config.region,
	forcePathStyle: s3Config.forcePathStyle,
	credentials: s3Config.credentials,
});
