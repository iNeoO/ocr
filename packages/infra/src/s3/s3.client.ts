import {
	CreateBucketCommand,
	HeadBucketCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { pinoLogger } from "../libs/pino.js";
import { s3Config } from "./s3.config.js";

export const s3 = new S3Client({
	endpoint: s3Config.endpoint,
	region: s3Config.region,
	forcePathStyle: s3Config.forcePathStyle,
	credentials: s3Config.credentials,
});

export const ensureBucketExists = async () => {
	try {
		await s3.send(
			new HeadBucketCommand({
				Bucket: s3Config.bucket,
			}),
		);

		pinoLogger.info({ bucket: s3Config.bucket }, "S3 bucket is ready");
		return;
	} catch (error) {
		pinoLogger.warn(
			{ err: error, bucket: s3Config.bucket },
			"S3 bucket missing, attempting creation",
		);
	}

	try {
		await s3.send(
			new CreateBucketCommand({
				Bucket: s3Config.bucket,
			}),
		);

		pinoLogger.info({ bucket: s3Config.bucket }, "S3 bucket created");
	} catch (error) {
		const errorName =
			error instanceof Error && "name" in error ? error.name : undefined;

		if (
			errorName === "BucketAlreadyOwnedByYou" ||
			errorName === "BucketAlreadyExists"
		) {
			pinoLogger.info(
				{ bucket: s3Config.bucket, err: error },
				"S3 bucket already exists",
			);
			return;
		}

		pinoLogger.error(
			{ err: error, bucket: s3Config.bucket },
			"Failed to ensure S3 bucket exists",
		);
		throw error;
	}
};
