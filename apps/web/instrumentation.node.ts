// This file is used to run database migrations in the docker builds or other self hosting environments.
// It is not suitable (a.k.a DEADLY) for serverless environments where the server will be restarted on each request.
//

import {
	BucketAlreadyOwnedByYou,
	CreateBucketCommand,
	PutBucketPolicyCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { db } from "@cap/database";
import { buildEnv, serverEnv } from "@cap/env";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";

export async function register() {
	console.log("⏳ Waiting 30 seconds to run migrations (allowing Cloud SQL Proxy to initialize)");

	// Function to trigger migrations with retry logic
	const triggerMigrations = async (retryCount = 0, maxRetries = 5) => {
		try {
			await runMigrations();
		} catch (error) {
			console.error(
				`🚨 Error triggering migrations (attempt ${retryCount + 1}):`,
				error,
			);
			if (retryCount < maxRetries - 1) {
				const waitTime = Math.min(15000 * (retryCount + 1), 60000); // Exponential backoff up to 60s
				console.log(
					`🔄 Retrying in ${waitTime / 1000} seconds... (${retryCount + 1}/${maxRetries})`,
				);
				setTimeout(() => triggerMigrations(retryCount + 1, maxRetries), waitTime);
			} else {
				console.error(`🚨 All ${maxRetries} migration attempts failed.`);
				console.error(`💡 Check Cloud SQL connectivity and VPC configuration`);
				console.error(`⚠️  Service will continue running, but migrations may need to be run manually.`);
				// DO NOT exit - let the service continue running
			}
		}
	};

	// Add a timeout to trigger migrations after 30 seconds on server start
	// This gives Cloud SQL Proxy more time to establish connection
	setTimeout(() => triggerMigrations(), 30000);

	setTimeout(() => createS3Bucket(), 30000);
}

async function createS3Bucket() {
	const s3Client = new S3Client({
		endpoint: serverEnv().CAP_AWS_ENDPOINT,
		region: serverEnv().CAP_AWS_REGION,
		credentials: {
			accessKeyId: serverEnv().CAP_AWS_ACCESS_KEY ?? "",
			secretAccessKey: serverEnv().CAP_AWS_SECRET_KEY ?? "",
		},
		forcePathStyle: serverEnv().S3_PATH_STYLE,
	});

	await s3Client
		.send(new CreateBucketCommand({ Bucket: serverEnv().CAP_AWS_BUCKET }))
		.then(() => {
			console.log("Created S3 bucket");
			return s3Client.send(
				new PutBucketPolicyCommand({
					Bucket: serverEnv().CAP_AWS_BUCKET,
					Policy: JSON.stringify({
						Version: "2012-10-17",
						Statement: [
							{
								Effect: "Allow",
								Principal: "*",
								Action: ["s3:GetObject"],
								Resource: [`arn:aws:s3:::${serverEnv().CAP_AWS_BUCKET}/*`],
							},
						],
					}),
				}),
			);
		})
		.then(() => {
			console.log("Configured S3 buckeet");
		})
		.catch((e) => {
			if (e instanceof BucketAlreadyOwnedByYou) {
				console.log("Found existing S3 bucket");
				return;
			}
		});
}

async function runMigrations() {
	const isDockerBuild = buildEnv.NEXT_PUBLIC_DOCKER_BUILD === "true";
	if (isDockerBuild) {
		try {
			console.log("🔍 DB migrations triggered");
			console.log("💿 Running DB migrations...");

			await migrate(db() as any, {
				migrationsFolder: path.join(process.cwd(), "/migrations"),
			});
			console.log("💿 Migrations run successfully!");
		} catch (error) {
			console.error("🚨 MIGRATION_FAILED", { error });
			throw error;
		}
	}
}
