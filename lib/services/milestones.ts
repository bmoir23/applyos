import "server-only";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  careerAchievements,
  careerMilestones,
  compensationEntries,
} from "@/db/schema";
import { generateStructured } from "@/lib/ai";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getProfile } from "@/lib/services/users";

const milestonePlanSchema = z.object({
  title: z.string(),
  contentMarkdown: z.string(),
});

const TEMPLATE_306090 = `# 30/60/90 day plan

## First 30 days
- Learn team rituals, tooling, and deployment paths.
- Ship one small, visible improvement.
- Schedule 1:1s with key partners across product and engineering.

## Days 31–60
- Own a medium-sized feature or operational improvement end to end.
- Document one process gap you observed and propose a fix.
- Present a short demo of progress to your manager.

## Days 61–90
- Lead a cross-functional initiative or on-call rotation handoff.
- Define measurable success metrics for your primary responsibility area.
- Draft a growth plan for the next quarter with your manager.
`;

function aiConfigured(): boolean {
  return Boolean(env.AI_API_KEY && env.AI_BASE_URL && env.AI_MODEL);
}

async function build306090Content(userId: string): Promise<{
  title: string;
  contentMarkdown: string;
}> {
  const profile = await getProfile(userId);
  const roles = profile?.targetRoles?.join(", ") ?? "your new role";

  if (!aiConfigured()) {
    return {
      title: "30/60/90 day plan",
      contentMarkdown: `${TEMPLATE_306090}\n\n_Target focus: ${roles}_`,
    };
  }

  try {
    const plan = await generateStructured(milestonePlanSchema, [
      {
        role: "system",
        content:
          "You create concise 30/60/90 day onboarding plans for newly hired professionals. Return JSON with title and contentMarkdown.",
      },
      {
        role: "user",
        content: `Create a 30/60/90 plan for target roles: ${roles}. Experience summary: ${profile?.experienceSummary ?? "Not provided"}.`,
      },
    ]);
    return plan;
  } catch {
    return {
      title: "30/60/90 day plan",
      contentMarkdown: `${TEMPLATE_306090}\n\n_Target focus: ${roles}_`,
    };
  }
}

export async function generate306090Plan(userId: string) {
  const { title, contentMarkdown } = await build306090Content(userId);

  const [milestone] = await db
    .insert(careerMilestones)
    .values({
      userId,
      planType: "30_60_90",
      title,
      contentMarkdown,
      status: "draft",
    })
    .returning();

  if (!milestone) {
    throw new Error("Unable to create career milestone");
  }

  await createAgentEvent({
    userId,
    eventType: "milestone_generate",
    summary: "Generated a 30/60/90 day career plan.",
    details: { milestoneId: milestone.id, planType: milestone.planType },
  });

  return milestone;
}

export async function listMilestones(userId: string) {
  return db.query.careerMilestones.findMany({
    where: eq(careerMilestones.userId, userId),
    orderBy: [desc(careerMilestones.createdAt)],
  });
}

export async function listAchievements(userId: string) {
  return db.query.careerAchievements.findMany({
    where: eq(careerAchievements.userId, userId),
    orderBy: [desc(careerAchievements.achievedAt)],
  });
}

type CreateAchievementInput = {
  title: string;
  description?: string;
  achievedAt?: Date;
  evidenceUrl?: string;
};

export async function createAchievement(
  userId: string,
  input: CreateAchievementInput,
) {
  const [achievement] = await db
    .insert(careerAchievements)
    .values({
      userId,
      title: input.title,
      description: input.description,
      achievedAt: input.achievedAt ?? new Date(),
      evidenceUrl: input.evidenceUrl,
    })
    .returning();

  if (!achievement) {
    throw new Error("Unable to create achievement");
  }

  return achievement;
}

export async function listCompensation(userId: string) {
  return db.query.compensationEntries.findMany({
    where: eq(compensationEntries.userId, userId),
    orderBy: [desc(compensationEntries.effectiveAt)],
  });
}

type CreateCompensationInput = {
  title: string;
  amountCents: number;
  currency?: string;
  effectiveAt?: Date;
  notes?: string;
};

export async function createCompensationEntry(
  userId: string,
  input: CreateCompensationInput,
) {
  const [entry] = await db
    .insert(compensationEntries)
    .values({
      userId,
      title: input.title,
      amountCents: input.amountCents,
      currency: input.currency ?? "USD",
      effectiveAt: input.effectiveAt ?? new Date(),
      notes: input.notes,
    })
    .returning();

  if (!entry) {
    throw new Error("Unable to create compensation entry");
  }

  return entry;
}
