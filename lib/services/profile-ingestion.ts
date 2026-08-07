import "server-only";

import { eq } from "drizzle-orm";

import { userProfiles } from "@/db/schema";
import { extractPublicProfile, assertSafePublicUrl } from "@/lib/firecrawl";
import { db } from "@/lib/db";
import { normalizeResumeText } from "@/lib/parsers/resumeParse";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { getProfile } from "@/lib/services/users";
import type { RemotePreference } from "@/lib/validators";

export type ProfileDraft = Partial<{
  targetRoles: string[];
  targetLocations: string[];
  remotePreference: RemotePreference;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  skills: string[];
  workAuthorizationNotes: string;
  experienceSummary: string;
  applicationPreferences: string;
  preferredCoverLetterTone: string;
  baseResumeText: string;
  linkedinUrl: string;
  nonNegotiables: string[];
}>;

type MergeProfileDraftOptions = {
  explicitEmptyFields?: Array<keyof ProfileDraft>;
};

function mergeStringArrays(
  existing: string[],
  incoming: string[] | undefined,
  field: keyof ProfileDraft,
  options?: MergeProfileDraftOptions,
) {
  if (incoming === undefined) {
    return existing;
  }
  if (
    incoming.length === 0 &&
    !options?.explicitEmptyFields?.includes(field)
  ) {
    return existing;
  }
  return [...new Set([...existing, ...incoming.map((item) => item.trim()).filter(Boolean)])];
}

export async function mergeProfileDraft(
  userId: string,
  draft: ProfileDraft,
  options?: MergeProfileDraftOptions,
) {
  const profile = await getProfile(userId);
  if (!profile) {
    throw new Error("Profile not found");
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (draft.targetRoles !== undefined) {
    updates.targetRoles = mergeStringArrays(
      profile.targetRoles,
      draft.targetRoles,
      "targetRoles",
      options,
    );
  }
  if (draft.targetLocations !== undefined) {
    updates.targetLocations = mergeStringArrays(
      profile.targetLocations,
      draft.targetLocations,
      "targetLocations",
      options,
    );
  }
  if (draft.skills !== undefined) {
    updates.skills = mergeStringArrays(
      profile.skills,
      draft.skills,
      "skills",
      options,
    );
  }
  if (draft.nonNegotiables !== undefined) {
    updates.nonNegotiables = mergeStringArrays(
      profile.nonNegotiables ?? [],
      draft.nonNegotiables,
      "nonNegotiables",
      options,
    );
  }
  if (draft.remotePreference !== undefined) {
    updates.remotePreference = draft.remotePreference;
  }
  if (draft.salaryMin !== undefined) {
    updates.salaryMin = draft.salaryMin;
  }
  if (draft.salaryMax !== undefined) {
    updates.salaryMax = draft.salaryMax;
  }
  if (draft.salaryCurrency !== undefined) {
    updates.salaryCurrency = draft.salaryCurrency;
  }
  if (draft.workAuthorizationNotes !== undefined) {
    updates.workAuthorizationNotes = draft.workAuthorizationNotes;
  }
  if (draft.applicationPreferences !== undefined) {
    updates.applicationPreferences = draft.applicationPreferences;
  }
  if (draft.preferredCoverLetterTone !== undefined) {
    updates.preferredCoverLetterTone = draft.preferredCoverLetterTone;
  }
  if (draft.linkedinUrl !== undefined) {
    updates.linkedinUrl = draft.linkedinUrl;
  }
  if (draft.experienceSummary !== undefined) {
    updates.experienceSummary = draft.experienceSummary;
  }
  if (draft.baseResumeText !== undefined) {
    updates.baseResumeText = draft.baseResumeText;
  }

  const [updated] = await db
    .update(userProfiles)
    .set(updates)
    .where(eq(userProfiles.userId, userId))
    .returning();

  if (!updated) {
    throw new Error("Unable to update profile");
  }

  return updated;
}

export async function ingestLinkedInProfile(userId: string, url: string) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("LinkedIn URL must use HTTP or HTTPS");
  }
  await assertSafePublicUrl(url);

  const extracted = await extractPublicProfile(url);
  const existing = await getProfile(userId);
  const experienceParts = [
    extracted.headline,
    extracted.summary,
    extracted.experienceSummary,
  ].filter(Boolean);
  const incomingExperience =
    experienceParts.length > 0 ? experienceParts.join("\n\n") : undefined;

  const profile = await mergeProfileDraft(userId, {
    linkedinUrl: url,
    skills: extracted.skills,
    experienceSummary:
      existing?.experienceSummary?.trim() || incomingExperience,
    baseResumeText: existing?.baseResumeText?.trim()
      ? undefined
      : extracted.rawMarkdown
        ? normalizeResumeText(extracted.rawMarkdown)
        : undefined,
  });

  await createAgentEvent({
    userId,
    eventType: "profile_ingest",
    summary:
      extracted.mode === "mock"
        ? "Imported mock LinkedIn profile preview (Firecrawl not configured)."
        : `Imported LinkedIn profile${extracted.fullName ? ` for ${extracted.fullName}` : ""}.`,
    details: {
      source: "linkedin",
      mode: extracted.mode,
      linkedinUrl: url,
      skillCount: extracted.skills.length,
    },
  });

  return { profile, extracted };
}

export async function ingestResumeText(userId: string, text: string) {
  const normalized = normalizeResumeText(text);
  if (normalized.length < 100) {
    throw new Error("Resume text must be at least 100 characters");
  }

  const existing = await getProfile(userId);
  const baseResumeText = existing?.baseResumeText
    ? `${existing.baseResumeText}\n\n---\n\n${normalized}`
    : normalized;

  const profile = await mergeProfileDraft(userId, {
    baseResumeText,
  });

  await createAgentEvent({
    userId,
    eventType: "profile_ingest",
    summary: "Imported resume text into profile.",
    details: {
      source: "resume_upload",
      characterCount: normalized.length,
    },
  });

  return profile;
}

export function summarizeProfile(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>) {
  return {
    targetRoles: profile.targetRoles,
    targetLocations: profile.targetLocations,
    skills: profile.skills,
    experienceSummary: profile.experienceSummary,
    linkedinUrl: profile.linkedinUrl,
    hasBaseResume: Boolean(profile.baseResumeText),
    hasScorecard: Boolean(profile.scorecardData),
    onboardingCompletedAt: profile.onboardingCompletedAt,
  };
}
