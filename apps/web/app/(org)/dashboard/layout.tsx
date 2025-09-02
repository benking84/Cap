import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

import { getDashboardData, Organization, Spaces } from "./dashboard-data";
import DashboardInner from "./_components/DashboardInner";
import { DashboardContexts } from "./Contexts";
import DesktopNav from "./_components/Navbar/Desktop";
import MobileNav from "./_components/Navbar/Mobile";

import { db } from "@cap/database";
import { users } from "@cap/database/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { UploadingProvider } from "./caps/UploadingContext";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = cookies().get('__session')?.value;

  console.log('session:', session);
  console.log('session exists:', !!session);
  
  if (!session) {
    console.log('No session found, redirecting to login');
    redirect('/login');
  }

  // Get the Firebase user
  let firebaseUser: import('firebase-admin/auth').UserRecord | undefined;
  try {
    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifySessionCookie(session);
    console.log('decodedToken:', JSON.stringify(decodedToken));
    firebaseUser = await auth.getUser(decodedToken.uid);
    console.log('Firebase user:', JSON.stringify(firebaseUser));
  } catch (error) {
    console.error('Error verifying session:', error);
    redirect('/login');
  }

  console.log('Firebase user:', firebaseUser);

  if (!firebaseUser) {
    redirect('/login');
  }

  // Get the database user
  let user;
  try {
    const [dbUser] = await db()
      .select()
      .from(users)
      .where(eq(users.id, firebaseUser.uid))
      .limit(1);
    user = dbUser;
  } catch (error) {
    console.error('Database error when fetching user:', error);
    // If DB error, redirect to onboarding to create user
    redirect('/onboarding');
  }

  // If user doesn't exist in database, redirect to onboarding
  if (!user) {
    redirect('/onboarding');
  }

  // If user exists but hasn't completed onboarding, redirect to onboarding
  if (!user.name || user.name.length <= 1) {
    redirect("/onboarding");
  }

  let organizationSelect: Organization[] = [];
  let spacesData: Spaces[] = [];
  try {
    const dashboardData = await getDashboardData(user);
    organizationSelect = dashboardData.organizationSelect;
    spacesData = dashboardData.spacesData;
  } catch (error) {
    console.error("Failed to load dashboard data", error);
    organizationSelect = [];
    spacesData = [];
  }

  let activeOrganization = organizationSelect.find(
    (organization) => organization.organization.id === user.activeOrganizationId
  );

  if (!activeOrganization && organizationSelect.length > 0) {
    activeOrganization = organizationSelect[0];
  }

  const isSubscribed =
    (user.stripeSubscriptionId &&
      user.stripeSubscriptionStatus !== "cancelled") ||
    !!user.thirdPartyStripeSubscriptionId;

  const theme = cookies().get("theme")?.value ?? "light";
  const sidebar = cookies().get("sidebarCollapsed")?.value ?? "false";

  return (
    <UploadingProvider>
      <DashboardContexts
        organizationData={organizationSelect}
        activeOrganization={activeOrganization || null}
        spacesData={spacesData}
        user={user}
        isSubscribed={isSubscribed}
        initialTheme={theme as "light" | "dark"}
        initialSidebarCollapsed={sidebar === "true"}
      >
        <div className="grid grid-cols-[auto,1fr] overflow-y-auto bg-gray-1 grid-rows-[auto,1fr] h-dvh min-h-dvh">
          <aside className="z-10 col-span-1 row-span-2">
            <DesktopNav />
          </aside>
          <div className="flex col-span-1 row-span-2 h-full custom-scroll focus:outline-none">
            <MobileNav />
            <div className="dashboard-page">
              <DashboardInner>{children}</DashboardInner>
            </div>
          </div>
        </div>
      </DashboardContexts>
    </UploadingProvider>
  );
}
