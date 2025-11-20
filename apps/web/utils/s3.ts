import {
	CompleteMultipartUploadCommand,
	type CompleteMultipartUploadCommandInput,
	type CompleteMultipartUploadOutput,
	CopyObjectCommand,
	type CopyObjectCommandInput,
	type CopyObjectCommandOutput,
	CreateMultipartUploadCommand,
	type CreateMultipartUploadCommandInput,
	type CreateMultipartUploadOutput,
	DeleteObjectCommand,
	type DeleteObjectCommandOutput,
	DeleteObjectsCommand,
	type DeleteObjectsCommandOutput,
	GetObjectCommand,
	HeadObjectCommand,
	type HeadObjectOutput,
	ListObjectsV2Command,
	type ListObjectsV2Output,
	type ObjectIdentifier,
	PutObjectCommand,
	PutObjectCommandInput,
	type PutObjectCommandOutput,
	type PutObjectRequest,
	S3Client,
	UploadPartCommand,
	type UploadPartCommandInput,
} from "@aws-sdk/client-s3";
import * as CloudFrontPresigner from "@aws-sdk/cloudfront-signer";
import {
	createPresignedPost,
	type PresignedPost,
	type PresignedPostOptions,
} from "@aws-sdk/s3-presigned-post";
import * as S3Presigner from "@aws-sdk/s3-request-presigner";
import { decrypt } from "@cap/database/crypto";
import type { s3Buckets } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { S3_BUCKET_URL } from "@cap/utils";
import type {
	RequestPresigningArguments,
	StreamingBlobPayloadInputTypes,
} from "@smithy/types";
import type { InferSelectModel } from "drizzle-orm";

type S3Config = {
	endpoint?: string | null;
	region?: string;
	accessKeyId?: string;
	secretAccessKey?: string;
	forcePathStyle?: boolean;
} | null;

async function tryDecrypt(
	text: string | null | undefined,
): Promise<string | undefined> {
	if (!text) return undefined;
	try {
		const decrypted = await decrypt(text);
		return decrypted;
	} catch (error) {
		return text;
	}
}

export async function getS3Config(config?: S3Config, internal = false) {
    // Log all relevant environment variables (masking sensitive values)
    console.log('[S3] Environment Configuration:', {
        NODE_ENV: process.env.NODE_ENV,
        CAP_AWS_REGION: serverEnv().CAP_AWS_REGION,
        CAP_AWS_ENDPOINT: serverEnv().CAP_AWS_ENDPOINT,
        S3_INTERNAL_ENDPOINT: serverEnv().S3_INTERNAL_ENDPOINT,
        S3_PUBLIC_ENDPOINT: serverEnv().S3_PUBLIC_ENDPOINT,
        S3_PATH_STYLE: serverEnv().S3_PATH_STYLE,
        hasAccessKey: !!(serverEnv().CAP_AWS_ACCESS_KEY),
        hasSecretKey: !!(serverEnv().CAP_AWS_SECRET_KEY),
		assessKey: serverEnv().CAP_AWS_ACCESS_KEY,
        secretKey: serverEnv().CAP_AWS_SECRET_KEY,
        usingConfig: !!config,
        internalCall: internal
    });

    const isGCS = serverEnv().CAP_AWS_ENDPOINT?.includes('googleapis.com');

    if (!config) {
        const endpoint = internal
            ? (serverEnv().S3_INTERNAL_ENDPOINT ?? serverEnv().CAP_AWS_ENDPOINT)
            : (serverEnv().S3_PUBLIC_ENDPOINT ?? serverEnv().CAP_AWS_ENDPOINT);

        const s3Config: any = {
            endpoint,
            region: serverEnv().CAP_AWS_REGION || 'us-central1',
            credentials: {
                accessKeyId: serverEnv().CAP_AWS_ACCESS_KEY ?? '',
                secretAccessKey: serverEnv().CAP_AWS_SECRET_KEY ?? '',
            },
            forcePathStyle: serverEnv().S3_PATH_STYLE ?? false,
        };

        // GCS specific configuration
        if (isGCS) {
            s3Config.region = 'auto';  // GCS uses 'auto' region for S3 compatibility
            s3Config.signingRegion = serverEnv().CAP_AWS_REGION || 'us-central1';
            s3Config.signatureVersion = 'v4';
            s3Config.forcePathStyle = false;
        }

        console.log('[S3] Using default config:', {
            endpoint: s3Config.endpoint,
            region: s3Config.region,
            forcePathStyle: s3Config.forcePathStyle,
            isGCS,
            hasCredentials: !!(s3Config.credentials.accessKeyId && s3Config.credentials.secretAccessKey)
        });

        return s3Config;
    }

	const endpoint = config.endpoint
		? await tryDecrypt(config.endpoint)
		: serverEnv().CAP_AWS_ENDPOINT;

	const region =
		(await tryDecrypt(config.region)) ?? serverEnv().CAP_AWS_REGION;

	const finalRegion = endpoint?.includes("localhost") ? "us-east-1" : region;

	const isLocalOrMinio =
		endpoint?.includes("localhost") || endpoint?.includes("127.0.0.1");

	return {
		endpoint,
		region: finalRegion,
		credentials: {
			accessKeyId:
				(await tryDecrypt(config.accessKeyId)) ??
				serverEnv().CAP_AWS_ACCESS_KEY ??
				"",
			secretAccessKey:
				(await tryDecrypt(config.secretAccessKey)) ??
				serverEnv().CAP_AWS_SECRET_KEY ??
				"",
		},
		forcePathStyle: endpoint?.endsWith("s3.amazonaws.com")
			? false
			: (config.forcePathStyle ?? true),
		useArnRegion: false,
		requestHandler: {
			connectionTimeout: isLocalOrMinio ? 5000 : 10000,
			socketTimeout: isLocalOrMinio ? 30000 : 60000,
		},
	};
}

export async function getS3Bucket(
	bucket?: InferSelectModel<typeof s3Buckets> | null,
) {
	if (!bucket?.bucketName) {
		return serverEnv().CAP_AWS_BUCKET || "";
	}

	return (
		((await tryDecrypt(bucket.bucketName)) ?? serverEnv().CAP_AWS_BUCKET) || ""
	);
}

export async function createS3Client(config?: S3Config, internal = false) {
    const startTime = Date.now();
    
    try {
        const s3Config = await getS3Config(config, internal);
        const isLocalOrMinio =
            s3Config.endpoint?.includes("localhost") ||
            s3Config.endpoint?.includes("127.0.0.1");

        const clientConfig = {
            ...s3Config,
            maxAttempts: isLocalOrMinio ? 5 : 3,
        };

        console.log('[S3] Creating S3 client with config:', {
            endpoint: clientConfig.endpoint,
            region: clientConfig.region,
            maxAttempts: clientConfig.maxAttempts,
            forcePathStyle: clientConfig.forcePathStyle,
            hasCredentials: !!(clientConfig.credentials?.accessKeyId && clientConfig.credentials?.secretAccessKey),
            isLocalOrMinio
        });

        const client = new S3Client(clientConfig);
        
        console.log(`[S3] S3 client created in ${Date.now() - startTime}ms`);
        
        return [client, s3Config] as const;
    } catch (error) {
        console.error('[S3] Error creating S3 client:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            configType: config ? 'custom' : 'default',
            internal,
            duration: Date.now() - startTime
        });
        throw error;
    }
}

interface S3BucketProvider {
	name: string;
	getSignedObjectUrl(key: string): Promise<string>;
	getObject(key: string): Promise<string | undefined>;
	listObjects(config?: {
		prefix?: string;
		maxKeys?: number;
	}): Promise<ListObjectsV2Output>;
	headObject(key: string): Promise<HeadObjectOutput>;
	putObject(
		key: string,
		body: StreamingBlobPayloadInputTypes,
		fields?: { contentType?: string },
	): Promise<PutObjectCommandOutput>;
	copyObject(
		source: string,
		key: string,
		args?: Omit<CopyObjectCommandInput, "Bucket" | "CopySource" | "Key">,
	): Promise<CopyObjectCommandOutput>;
	deleteObject(key: string): Promise<DeleteObjectCommandOutput>;
	deleteObjects(keys: ObjectIdentifier[]): Promise<DeleteObjectsCommandOutput>;
	getPresignedPutUrl(
		key: string,
		args?: Omit<PutObjectRequest, "Key" | "Bucket">,
		signingArgs?: RequestPresigningArguments,
	): Promise<string>;
	getPresignedPostUrl(
		key: string,
		args: Omit<PresignedPostOptions, "Bucket" | "Key">,
	): Promise<PresignedPost>;
	multipart: {
		create(
			key: string,
			args?: Omit<CreateMultipartUploadCommandInput, "Bucket" | "Key">,
		): Promise<CreateMultipartUploadOutput>;
		getPresignedUploadPartUrl(
			key: string,
			uploadId: string,
			partNumber: number,
			args?: Omit<
				UploadPartCommandInput,
				"Key" | "Bucket" | "PartNumber" | "UploadId"
			>,
		): Promise<string>;
		complete(
			key: string,
			uploadId: string,
			args?: Omit<
				CompleteMultipartUploadCommandInput,
				"Key" | "Bucket" | "UploadId"
			>,
		): Promise<CompleteMultipartUploadOutput>;
	};
}

function createCloudFrontProvider(config: {
	s3: (internal: boolean) => Promise<S3Client>;
	bucket: string;
	keyPairId: string;
	privateKey: string;
}): S3BucketProvider {
	const s3 = createS3Provider(config.s3, config.bucket);
	return {
		...s3,
		async getSignedObjectUrl(key: string) {
			const url = `${S3_BUCKET_URL}/${key}`;
			const expires = Math.floor((Date.now() + 3600 * 1000) / 1000);

			const policy = {
				Statement: [
					{
						Resource: url,
						Condition: {
							DateLessThan: { "AWS:EpochTime": Math.floor(expires) },
						},
					},
				],
			};

			return CloudFrontPresigner.getSignedUrl({
				url,
				keyPairId: config.keyPairId,
				privateKey: config.privateKey,
				policy: JSON.stringify(policy),
			});
		},
	};
}

function createS3Provider(
	getClient: (internal: boolean) => Promise<S3Client>,
	bucket: string,
): S3BucketProvider {
	return {
		name: bucket,
		async getSignedObjectUrl(key: string) {
			return S3Presigner.getSignedUrl(
				await getClient(false),
				new GetObjectCommand({ Bucket: bucket, Key: key }),
				{ expiresIn: 3600 },
			);
		},
		async getObject(key: string, format = "string") {
			const resp = await getClient(true).then((c) =>
				c.send(new GetObjectCommand({ Bucket: bucket, Key: key })),
			);
			if (format === "string") {
				return await resp.Body?.transformToString();
			}
		},
		async listObjects(config) {
			return await getClient(true).then((c) =>
				c.send(
					new ListObjectsV2Command({
						Bucket: bucket,
						Prefix: config?.prefix,
						MaxKeys: config?.maxKeys,
					}),
				),
			);
		},
		headObject: (key) =>
			getClient(true).then((client) =>
				client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })),
			),
		putObject: (key, body, fields) =>
			getClient(true).then((client) =>
				client.send(
					new PutObjectCommand({
						Bucket: bucket,
						Key: key,
						Body: body,
						ContentType: fields?.contentType,
					}),
				),
			),
		copyObject: (source, key, args) =>
			getClient(true).then((client) =>
				client.send(
					new CopyObjectCommand({
						Bucket: bucket,
						CopySource: source,
						Key: key,
						...args,
					}),
				),
			),
		deleteObject: (key) =>
			getClient(true).then((client) =>
				client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })),
			),
		deleteObjects: (objects: ObjectIdentifier[]) =>
			getClient(true).then((client) =>
				client.send(
					new DeleteObjectsCommand({
						Bucket: bucket,
						Delete: {
							Objects: objects,
						},
					}),
				),
			),
		getPresignedPutUrl: (key: string, args, signingArgs) =>
			getClient(false).then((client) =>
				S3Presigner.getSignedUrl(
					client,
					new PutObjectCommand({ Bucket: bucket, Key: key, ...args }),
					signingArgs,
				),
			),
		getPresignedPostUrl: (
			key: string,
			args: Omit<PresignedPostOptions, "Bucket" | "Key">,
		) =>
			getClient(false).then((client) =>
				createPresignedPost(client, {
					...args,
					Bucket: bucket,
					Key: key,
				}),
			),
		multipart: {
			create: (key, args) =>
				getClient(true).then((client) =>
					client.send(
						new CreateMultipartUploadCommand({
							...args,
							Bucket: bucket,
							Key: key,
						}),
					),
				),
			getPresignedUploadPartUrl: (key, uploadId, partNumber, args) => {
				console.log({
					...args,
					Bucket: bucket,
					Key: key,
					UploadId: uploadId,
					PartNumber: partNumber,
				});
				return getClient(false).then((client) =>
					S3Presigner.getSignedUrl(
						client,
						new UploadPartCommand({
							...args,
							Bucket: bucket,
							Key: key,
							UploadId: uploadId,
							PartNumber: partNumber,
						}),
					),
				);
			},
			complete: (key, uploadId, args) =>
				getClient(true).then((client) =>
					client.send(
						new CompleteMultipartUploadCommand({
							Bucket: bucket,
							Key: key,
							UploadId: uploadId,
							...args,
						}),
					),
				),
		},
	};
}

export async function createBucketProvider(
	customBucket?: InferSelectModel<typeof s3Buckets> | null,
) {
	const bucket = await getS3Bucket(customBucket);
	console.log({ bucket });
	const getClient = (internal: boolean) =>
		createS3Client(customBucket, internal).then((v) => v[0]);

	if (!customBucket && serverEnv().CAP_CLOUDFRONT_DISTRIBUTION_ID) {
		const keyPairId = serverEnv().CLOUDFRONT_KEYPAIR_ID;
		const privateKey = serverEnv().CLOUDFRONT_KEYPAIR_PRIVATE_KEY;

		if (!keyPairId || !privateKey)
			throw new Error("Missing CloudFront keypair ID or private key");

		return createCloudFrontProvider({
			s3: getClient,
			bucket,
			keyPairId,
			privateKey,
		});
	}

	return createS3Provider(getClient, bucket);
}
