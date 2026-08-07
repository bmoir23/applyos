import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { tribeMemberships, tribePosts, tribes, users } from "@/db/schema";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/services/users";
import { createAgentEvent } from "@/lib/services/agentEvents";

const DEFAULT_TRIBE_SLUG = "remote-heroes-nomads";

const ROLE_TRIBE_RULES: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /devops|sre|platform|infrastructure/i, slug: "not-my-ops-but-my-devops" },
  { pattern: /full[\s-]?stack|fullstack/i, slug: "fully-stacked-warriors" },
  { pattern: /sales|account executive|ae\b|business development/i, slug: "coffee-is-for-closers" },
  { pattern: /cloud|architect|aws|azure|gcp/i, slug: "head-in-the-clouds" },
];

function resolveTribeSlug(targetRoles: string[]): string {
  const joined = targetRoles.join(" ");
  for (const rule of ROLE_TRIBE_RULES) {
    if (rule.pattern.test(joined)) {
      return rule.slug;
    }
  }
  return DEFAULT_TRIBE_SLUG;
}

export async function listTribes() {
  return db.query.tribes.findMany({
    orderBy: [desc(tribes.createdAt)],
  });
}

export async function getTribeBySlug(slug: string) {
  return db.query.tribes.findFirst({
    where: eq(tribes.slug, slug),
  });
}

export async function listMemberships(userId: string) {
  return db.query.tribeMemberships.findMany({
    where: eq(tribeMemberships.userId, userId),
    with: { tribe: true },
    orderBy: [desc(tribeMemberships.joinedAt)],
  });
}

export async function ensureHiredMembership(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.communityUnlockedAt && !user.hiredAt) {
    return null;
  }

  const profile = await getProfile(userId);
  const targetRoles = profile?.targetRoles ?? [];
  const tribeSlug = resolveTribeSlug(targetRoles);
  const tribe = await getTribeBySlug(tribeSlug);
  if (!tribe) {
    throw new Error(`Default tribe not found: ${tribeSlug}`);
  }

  const existing = await db.query.tribeMemberships.findFirst({
    where: and(
      eq(tribeMemberships.userId, userId),
      eq(tribeMemberships.tribeId, tribe.id),
    ),
  });
  if (existing) {
    return existing;
  }

  const [membership] = await db
    .insert(tribeMemberships)
    .values({
      tribeId: tribe.id,
      userId,
      role: "member",
    })
    .returning();

  if (!membership) {
    throw new Error("Unable to create tribe membership");
  }

  await createAgentEvent({
    userId,
    eventType: "tribe_unlock",
    summary: `Joined ${tribe.name} after hire unlock.`,
    details: { tribeId: tribe.id, tribeSlug: tribe.slug },
  });

  return membership;
}

export async function listTribePosts(tribeId: string) {
  return db.query.tribePosts.findMany({
    where: eq(tribePosts.tribeId, tribeId),
    orderBy: [desc(tribePosts.createdAt)],
    with: { author: true },
  });
}

export async function createTribePost(
  userId: string,
  tribeId: string,
  title: string,
  body: string,
) {
  const membership = await db.query.tribeMemberships.findFirst({
    where: and(
      eq(tribeMemberships.userId, userId),
      eq(tribeMemberships.tribeId, tribeId),
    ),
  });
  if (!membership) {
    throw new Error("Tribe membership is required to post");
  }

  const [post] = await db
    .insert(tribePosts)
    .values({
      tribeId,
      authorUserId: userId,
      title,
      bodyMarkdown: body,
    })
    .returning();

  if (!post) {
    throw new Error("Unable to create tribe post");
  }

  return post;
}
