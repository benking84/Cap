import { type NextRequest } from "next/server";
import { getFirebaseUser } from "@cap/database/auth/firebase-session";
import { organizationMembers, organizations, users } from "@cap/database/schema";
import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { nanoId } from "@cap/database/helpers";
import { and, eq, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const user = await getFirebaseUser();
    const { firstName, lastName } = await request.json();

    console.log('Onboarding API - Firebase user:', user?.id, user?.email);
    console.log('Onboarding API - Form data:', { firstName, lastName });

    if (!user) {
      console.error("User not found");
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Check if user exists in database, if not create them
    console.log('Checking if user exists in database...');
    const [existingUser] = await db()
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!existingUser) {
      console.log('User not found in database, creating new user...');
      // Create user in database - only provide non-null values
      const insertData: any = {
        id: user.id,
        email: user.email,
        name: firstName,
        lastName: lastName,
      };
      
      if (user.image) insertData.image = user.image;
      if (user.emailVerified) insertData.emailVerified = user.emailVerified;
      
      console.log('Inserting user data:', insertData);
      await db().insert(users).values(insertData);
      console.log('User created successfully');
    } else {
      console.log('User exists, updating name and lastName...');
      // Update existing user
      await db()
        .update(users)
        .set({
          name: firstName,
          lastName: lastName,
        })
        .where(eq(users.id, user.id));
      console.log('User updated successfully');
    }

	const memberButNotOwner = await db()
		.select()
		.from(organizationMembers)
		.leftJoin(
			organizations,
			eq(organizationMembers.organizationId, organizations.id),
		)
		.where(
			and(
				eq(organizationMembers.userId, user.id),
				ne(organizations.ownerId, user.id),
			),
		)
		.limit(1);

	console.log("memberButNotOwner", memberButNotOwner);

	const isMemberOfOrganization = memberButNotOwner.length > 0;

	console.log("isMemberOfOrganization", isMemberOfOrganization);

	const [organization] = await db()
		.select()
		.from(organizations)
		.where(
			or(
				eq(organizations.ownerId, user.id),
				eq(organizationMembers.userId, user.id),
			),
		)
		.leftJoin(
			organizationMembers,
			eq(organizations.id, organizationMembers.organizationId),
		);

	if (!organization) {
		const organizationId = nanoId();

		await db()
			.insert(organizations)
			.values({
				id: organizationId,
				ownerId: user.id,
				name: `${firstName} ${lastName}'s Organization`,
			});

		await db().insert(organizationMembers).values({
			id: nanoId(),
			userId: user.id,
			role: "owner",
			organizationId,
		});

		await db()
			.update(users)
			.set({ activeOrganizationId: organizationId })
			.where(eq(users.id, user.id));
	}

	revalidatePath("/onboarding");

    return Response.json(
      { 
        success: true, 
        message: "Onboarding completed successfully",
        isMemberOfOrganization 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Onboarding API error:', error);
    return Response.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
