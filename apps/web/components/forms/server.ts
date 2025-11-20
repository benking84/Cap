"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { nanoId } from "@cap/database/helpers";
import {
	organizationMembers,
	organizations,
	users,
} from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createBucketProvider } from "@/utils/s3";
import { getFirebaseUser } from "@cap/database/auth/firebase-session";

export async function createOrganization(formData: FormData) {
	 const user = await getFirebaseUser();
	if (!user) throw new Error("Unauthorized");

	// Extract the name from the FormData
	const name = formData.get("name") as string;
	if (!name) throw new Error("Organization name is required");

	// Check if organization with the same name already exists
	const existingOrg = await db()
		.select({ id: organizations.id })
		.from(organizations)
		.where(eq(organizations.name, name))
		.limit(1);

	if (existingOrg.length > 0) {
		throw new Error("Organization with this name already exists");
	}

	const organizationId = nanoId();

	// Create the organization first
	const orgValues: {
		id: string;
		ownerId: string;
		name: string;
		iconUrl?: string;
	} = {
		id: organizationId,
		ownerId: user.id,
		name: name,
	};

	// Check if an icon file was uploaded
	const iconFile = formData.get("icon") as File;
	if (iconFile) {
		// Validate file type
		if (!iconFile.type.startsWith("image/")) {
			throw new Error("File must be an image");
		}

		// Validate file size (limit to 2MB)
		if (iconFile.size > 2 * 1024 * 1024) {
			throw new Error("File size must be less than 2MB");
		}

		try {
			// Create a unique file key
			const fileExtension = iconFile.name.split(".").pop();
			const fileKey = `organizations/${organizationId}/icon-${Date.now()}.${fileExtension}`;

			console.log('Creating bucket provider...');
			const bucket = await createBucketProvider();

			console.log('Bucket provider created:', { 
				bucketName: bucket.name,
				fileKey,
				fileType: iconFile.type,
				env: {
					CAP_AWS_BUCKET: serverEnv().CAP_AWS_BUCKET,
					CAP_AWS_ENDPOINT: serverEnv().CAP_AWS_ENDPOINT,
					CAP_AWS_REGION: serverEnv().CAP_AWS_REGION
				}
			});

			const fileBytes = await iconFile.bytes();
			const bucketName = bucket.name;
			
			if (!bucketName) {
				throw new Error('Bucket name is not defined');
			}

			console.log(`Uploading file (${fileBytes.length} bytes) to bucket ${bucketName} with key ${fileKey}`);

			await bucket.putObject(fileKey, fileBytes, {
				contentType: iconFile.type,
			});

			console.log('File uploaded successfully');

			let iconUrl;
			const awsEndpoint = serverEnv().CAP_AWS_ENDPOINT;
			const bucketUrl = serverEnv().CAP_AWS_BUCKET_URL;

			if (bucketUrl) {
				iconUrl = `${bucketUrl}/${fileKey}`;
			} else if (awsEndpoint) {
				// For GCS, the URL format is different
				if (awsEndpoint.includes('googleapis.com')) {
					iconUrl = `https://storage.googleapis.com/${bucketName}/${fileKey}`;
				} else {
					iconUrl = `${awsEndpoint}/${bucketName}/${fileKey}`;
				}
			} else {
				const region = serverEnv().CAP_AWS_REGION || 'us-east-1';
				iconUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
			}

			console.log('Generated icon URL:', { iconUrl });
			// Add the icon URL to the organization values
			orgValues.iconUrl = iconUrl;
		} catch (error) {
			console.error("Error uploading organization icon:", {
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				env: {
					CAP_AWS_BUCKET: serverEnv().CAP_AWS_BUCKET,
					CAP_AWS_ENDPOINT: serverEnv().CAP_AWS_ENDPOINT,
					CAP_AWS_REGION: serverEnv().CAP_AWS_REGION,
					S3_PATH_STYLE: serverEnv().S3_PATH_STYLE
				}
			});
			throw new Error(error instanceof Error ? error.message : "Failed to upload organization icon");
		}
	}

	// Insert the organization with or without the icon URL
	await db().insert(organizations).values(orgValues);

	// Add the user as an owner of the organization
	await db().insert(organizationMembers).values({
		id: nanoId(),
		userId: user.id,
		role: "owner",
		organizationId,
	});

	// Set this as the active organization for the user
	await db()
		.update(users)
		.set({ activeOrganizationId: organizationId })
		.where(eq(users.id, user.id));

	revalidatePath("/dashboard");
	return { success: true, organizationId };
}
