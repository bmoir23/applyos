import type { AiMessage } from "@/lib/ai/providers";

type ProfileContext = {
  targetRoles: string[];
  targetLocations: string[];
  remotePreference: string;
  skills: string[];
  experienceSummary: string | null;
  workAuthorizationNotes: string | null;
  baseResumeText: string | null;
};

type JobContext = {
  title: string;
  companyName: string;
  location: string | null;
  remoteType: string | null;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
};

function contextJson(profile: ProfileContext, job: JobContext): string {
  return JSON.stringify({ profile, job }, null, 2);
}

export function scoringMessages(
  profile: ProfileContext,
  job: JobContext,
): AiMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a rigorous resume-to-job evaluator. Use only supplied facts. Never infer unlisted skills or experience. Return JSON only with: score (0-100 integer), strengths, requiredSkillGaps, preferredSkillGaps, rationale, suggestedResumeImprovements, and priority (high|medium|low|skip). Separate required from preferred gaps. Location and seniority mismatches must reduce the score.",
    },
    {
      role: "user",
      content: `Evaluate this candidate and job:\n${contextJson(profile, job)}`,
    },
  ];
}

export function tailoredResumeMessages(
  profile: ProfileContext,
  job: JobContext,
): AiMessage[] {
  return [
    {
      role: "system",
      content:
        "Create a tailored resume draft using only facts explicitly present in the supplied profile and base resume. Preserve employers, titles, dates, education, metrics, certifications, and skills exactly. Do not add unsupported keywords. Reframe and reorder true material for relevance. If a requirement is unsupported, omit it rather than fabricating it. Return JSON only with markdown and changeSummary. The change summary must explain material edits and unresolved gaps.",
    },
    {
      role: "user",
      content: `Tailor the candidate's resume for this job:\n${contextJson(profile, job)}`,
    },
  ];
}

export function coverLetterMessages(
  profile: ProfileContext,
  job: JobContext,
  tone: string,
): AiMessage[] {
  return [
    {
      role: "system",
      content:
        "Write a concise cover letter using only supplied candidate and posting facts. Do not invent company knowledge, personal connections, achievements, metrics, or qualifications. Return JSON only with markdown and changeSummary.",
    },
    {
      role: "user",
      content: `Tone: ${tone}\nCreate the cover letter from:\n${contextJson(profile, job)}`,
    },
  ];
}

export function emailClassificationMessages(
  applicationStatus: string,
  subject: string | undefined,
  bodyText: string,
): AiMessage[] {
  return [
    {
      role: "system",
      content:
        "Classify job-search email status conservatively. Return JSON only with suggestedStatus, confidence (0-100 integer), and rationale. Never claim an outcome not explicit in the message. This is a suggestion requiring user approval.",
    },
    {
      role: "user",
      content: JSON.stringify({
        currentApplicationStatus: applicationStatus,
        subject,
        bodyText,
      }),
    },
  ];
}
