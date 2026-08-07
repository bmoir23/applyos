import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/onboarding/profile-form";
import { LinkedInImportForm } from "@/components/onboarding/linkedin-import-form";
import { getAppUserProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Set up your profile",
};

export default async function OnboardingPage() {
  const { profile } = await getAppUserProfile();

  if (profile.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Welcome</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Build your source-of-truth profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          ApplyOS uses this information to find compatible roles and create
          drafts. Nothing is submitted or sent without your approval.
        </p>
      </div>
      <ProfileForm
        key={profile.updatedAt?.toISOString() ?? "new"}
        isOnboarding
        initialValues={{
          targetRolesText: profile.targetRoles.join(", "),
          targetLocationsText: profile.targetLocations.join(", "),
          remotePreference: profile.remotePreference,
          salaryMin: profile.salaryMin?.toString() ?? "",
          salaryMax: profile.salaryMax?.toString() ?? "",
          salaryCurrency: profile.salaryCurrency ?? "USD",
          skillsText: profile.skills.join(", "),
          workAuthorizationNotes: profile.workAuthorizationNotes ?? "",
          experienceSummary: profile.experienceSummary ?? "",
          applicationPreferences: profile.applicationPreferences ?? "",
          preferredCoverLetterTone:
            (profile.preferredCoverLetterTone as
              | "professional"
              | "warm"
              | "direct"
              | "enthusiastic") ?? "professional",
          baseResumeText: profile.baseResumeText ?? "",
        }}
      />
      <LinkedInImportForm />
    </div>
  );
}
