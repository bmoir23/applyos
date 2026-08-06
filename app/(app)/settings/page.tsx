import type { Metadata } from "next";

import { ProfileForm } from "@/components/onboarding/profile-form";
import { getAppUserProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { profile } = await getAppUserProfile();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your targets and source resume accurate. These facts ground every
          recommendation and draft.
        </p>
      </div>
      <ProfileForm
        isOnboarding={false}
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
    </div>
  );
}
