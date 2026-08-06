import { NextResponse } from "next/server";

import { requireAppUser } from "@/lib/auth";
import { crawlJobSource } from "@/lib/services/jobs";
import { crawlJobInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const appUser = await requireAppUser();
    const input = crawlJobInputSchema.parse(await request.json());
    const result = await crawlJobSource(appUser.id, input.jobSourceId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to crawl job source";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
