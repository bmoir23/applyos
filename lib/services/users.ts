import "server-only";

import { eq } from "drizzle-orm";

import { userProfiles } from "@/db/schema";
import { db } from "@/lib/db";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/lib/validators";

export async function getProfile(userId: string) {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });
}

export async function saveProfile(
  userId: string,
  input: ProfileFormValues,
) {
  const values = profileFormSchema.parse(input);
  const [profile] = await db
    .insert(userProfiles)
    .values({
      userId,
      ...values,
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        ...values,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!profile) {
    throw new Error("Unable to save profile");
  }

  return profile;
}
