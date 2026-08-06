import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { userProfiles, users } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Require an authenticated Clerk session.
 * Use in server components, server actions, and route handlers.
 */
export async function requireAuth() {
  const session = await auth();

  if (!session.userId) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.userId,
    sessionId: session.sessionId,
    orgId: session.orgId,
  };
}

/**
 * Return the current user id, or null when signed out.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Return the Clerk user object for the active session, if any.
 */
export async function getCurrentUser() {
  return currentUser();
}

/**
 * Return the authenticated app user, provisioning the Neon mirror and profile
 * on first access. Every tenant-scoped service should start here.
 */
export async function requireAppUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress;
  if (!email) {
    throw new Error("Your account needs a primary email address");
  }

  const [appUser] = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!appUser) {
    throw new Error("Unable to provision application user");
  }

  await db
    .insert(userProfiles)
    .values({ userId: appUser.id })
    .onConflictDoNothing({ target: userProfiles.userId });

  return appUser;
}

export async function getAppUserProfile() {
  const appUser = await requireAppUser();
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, appUser.id),
  });

  if (!profile) {
    throw new Error("User profile was not provisioned");
  }

  return { appUser, profile };
}

export async function requireOnboardedAppUser() {
  const result = await getAppUserProfile();
  if (!result.profile.onboardingCompletedAt) {
    redirect("/onboarding");
  }
  return result;
}
