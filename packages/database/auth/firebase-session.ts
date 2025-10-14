import { cookies } from "next/headers";
import { eq, InferSelectModel } from "drizzle-orm";
import { cache } from "react";
import { db } from "../";
import { users } from "../schema";

// Import Firebase admin locally to avoid cross-package import and rootDir errors
async function getFirebaseAdminAuth() {
  const { getFirebaseAdminAuth } = await import("./firebase-admin");
  return getFirebaseAdminAuth();
}

export const getFirebaseUser = cache(
  async (): Promise<InferSelectModel<typeof users> | null> => {
    try {
      const session = cookies().get('__session')?.value;
      
      if (!session) return null;

      // Verify Firebase session
      const auth = await getFirebaseAdminAuth();
      const decodedToken = await auth.verifySessionCookie(session);
      const firebaseUser = await auth.getUser(decodedToken.uid);

      // Check if user exists in database
      const [dbUser] = await db()
        .select()
        .from(users)
        .where(eq(users.id, firebaseUser.uid))
        .limit(1);

      // Return user if exists, or return Firebase user info for onboarding
      if (dbUser) {
        return dbUser;
      } else {
        // Return a minimal user-like object with required fields; preferences nullable
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || null,
          lastName: null,
          image: firebaseUser.photoURL || null,
          emailVerified: firebaseUser.emailVerified ? new Date() : null,
          activeOrganizationId: null as any,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          thirdPartyStripeSubscriptionId: null,
          stripeSubscriptionStatus: null,
          stripeSubscriptionPriceId: null,
          created_at: new Date(),
          updated_at: new Date(),
          onboarding_completed_at: null,
          customBucket: null,
          inviteQuota: 1,
          preferences: null,
        } as InferSelectModel<typeof users>;
      }
    } catch (error) {
      // Be quiet in production to avoid noisy logs; still return null
      if (process.env.NODE_ENV === 'development') {
        console.warn('getFirebaseUser: failed to verify session cookie');
      }
      return null;
    }
  }
);
