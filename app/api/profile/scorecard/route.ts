import { auth } from "@clerk/nextjs/server";

import { requireAppUser } from "@/lib/auth";
import { summarizeProfile } from "@/lib/services/profile-ingestion";
import { generateScorecard } from "@/lib/services/scorecard";
import { getProfile } from "@/lib/services/users";

export async function POST() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appUser = await requireAppUser();
    const scorecard = await generateScorecard(appUser.id);
    const profile = await getProfile(appUser.id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    return Response.json({
      scorecard,
      profile: summarizeProfile(profile),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate scorecard",
      },
      { status: 500 },
    );
  }
}
