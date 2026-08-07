import "server-only";

import { eq } from "drizzle-orm";

import { emailIdentities, users } from "@/db/schema";
import { db } from "@/lib/db";
import { slugifyEmailSubdomain } from "@/lib/email/subdomain";
import { env } from "@/lib/env";

async function subdomainTaken(subdomain: string): Promise<boolean> {
  const existing = await db.query.emailIdentities.findFirst({
    where: eq(emailIdentities.subdomain, subdomain),
  });
  if (existing) return true;

  const userWithSubdomain = await db.query.users.findFirst({
    where: eq(users.emailSubdomain, subdomain),
  });
  return Boolean(userWithSubdomain);
}

async function allocateUniqueSubdomain(base: string): Promise<string> {
  const candidate = slugifyEmailSubdomain(base);
  if (!(await subdomainTaken(candidate))) {
    return candidate;
  }

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const withSuffix = slugifyEmailSubdomain(`${base}-${suffix}`);
    if (!(await subdomainTaken(withSuffix))) {
      return withSuffix;
    }
  }

  throw new Error("Unable to allocate a unique email subdomain");
}

export async function provisionEmailIdentity(
  userId: string,
  preferredSubdomain?: string,
) {
  const existing = await getEmailIdentity(userId);
  if (existing) {
    return existing;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    throw new Error("User not found");
  }

  const seed =
    preferredSubdomain ??
    user.email.split("@")[0] ??
    user.firstName ??
    "user";
  const subdomain = await allocateUniqueSubdomain(seed);
  const displayAddress = `${subdomain}@${env.EMAIL_INBOUND_DOMAIN}`.toLowerCase();

  const [identity] = await db
    .insert(emailIdentities)
    .values({
      userId,
      subdomain,
      displayAddress,
      isActive: true,
    })
    .returning();

  if (!identity) {
    throw new Error("Unable to provision email identity");
  }

  await db
    .update(users)
    .set({
      emailSubdomain: subdomain,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return identity;
}

export async function getEmailIdentity(userId: string) {
  return db.query.emailIdentities.findFirst({
    where: eq(emailIdentities.userId, userId),
  });
}

export async function getEmailIdentityByAddress(displayAddress: string) {
  return db.query.emailIdentities.findFirst({
    where: eq(emailIdentities.displayAddress, displayAddress.toLowerCase()),
  });
}
