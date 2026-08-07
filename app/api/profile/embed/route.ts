import { auth } from "@clerk/nextjs/server";

import { requireAppUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/env";
import { embedAndStoreProfile } from "@/lib/services/matching";

export async function POST() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isFeatureEnabled("semantic_matching")) {
    return Response.json(
      { error: "semantic_matching feature is disabled" },
      { status: 403 },
    );
  }

  try {
    const appUser = await requireAppUser();
    await embedAndStoreProfile(appUser.id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to embed profile",
      },
      { status: 500 },
    );
  }
}
