import { eq } from "drizzle-orm";
import { z } from "zod";

import { users } from "@/db/schema";
import { db } from "@/lib/db";
import { authenticateAutomationRequest } from "@/lib/n8n/auth";
import {
  automationEventSchema,
  type ProfileIngestPayload,
} from "@/lib/n8n/contracts";
import { createAgentEvent } from "@/lib/services/agentEvents";
import { createApprovalRequest } from "@/lib/services/approvals";
import {
  generateCoverLetter,
  generateTailoredResume,
} from "@/lib/services/documents";
import { classifyApplicationEmail } from "@/lib/services/emailMessages";
import { crawlJobSource } from "@/lib/services/jobs";
import { scoreJob } from "@/lib/services/scoring";
import {
  completeWorkflowRun,
  failWorkflowRun,
  startWorkflowRun,
} from "@/lib/services/workflows";

const METHOD_NOT_ALLOWED = Response.json(
  { error: "Method not allowed" },
  { status: 405 },
);

class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}

type EmbeddedJobResult = {
  id: string;
  embeddedAt: Date | null;
};

async function loadEmbedAndStoreJob(): Promise<
  ((userId: string, jobId: string) => Promise<EmbeddedJobResult>) | null
> {
  try {
    const mod = await import("@/lib/services/matching");
    if (typeof mod.embedAndStoreJob !== "function") {
      return null;
    }
    return async (userId, jobId) => {
      const job = await mod.embedAndStoreJob(userId, jobId);
      return {
        id: job.id,
        embeddedAt: job.embeddedAt ?? null,
      };
    };
  } catch {
    return null;
  }
}

async function loadProfileIngest(): Promise<
  ((userId: string, payload: ProfileIngestPayload) => Promise<unknown>) | null
> {
  try {
    const mod = await import("@/lib/services/profile-ingestion");
    return async (userId, payload) => {
      if (payload.source === "linkedin" && payload.linkedinUrl) {
        return mod.ingestLinkedInProfile(userId, payload.linkedinUrl);
      }
      if (payload.resumeId) {
        return { ok: true, note: "resumeId ingestion uses resume text upload API" };
      }
      return mod.mergeProfileDraft(userId, {});
    };
  } catch {
    return null;
  }
}

async function handleAutomationEvent(
  userId: string,
  input: z.infer<typeof automationEventSchema>,
  workflowRunId: string,
): Promise<Record<string, unknown>> {
  switch (input.event) {
    case "crawl_source": {
      const result = await crawlJobSource(userId, input.payload.jobSourceId, {
        workflowRunId,
        workflowSource: "n8n",
      });
      return { mode: result.mode, jobsStored: result.jobIds.length };
    }
    case "score_job": {
      return scoreJob(userId, input.payload.jobId);
    }
    case "classify_email_status": {
      const result = await classifyApplicationEmail(userId, input.payload);
      return {
        emailMessageId: result.message.id,
        classification: result.classification,
      };
    }
    case "create_agent_event": {
      const event = await createAgentEvent({
        userId,
        workflowRunId,
        ...input.payload,
      });
      return { agentEventId: event.id };
    }
    case "embed_job": {
      const embedAndStoreJob = await loadEmbedAndStoreJob();
      if (!embedAndStoreJob) {
        throw new NotImplementedError(
          "embed_job is not available until the matching service is deployed",
        );
      }
      const job = await embedAndStoreJob(userId, input.payload.jobId);
      return {
        jobId: job.id,
        embeddedAt: job.embeddedAt?.toISOString() ?? null,
      };
    }
    case "profile_ingest": {
      const profileIngest = await loadProfileIngest();
      if (!profileIngest) {
        throw new NotImplementedError(
          "profile_ingest is not available until the profile ingestion service is deployed",
        );
      }
      const result = await profileIngest(userId, input.payload);
      return { result };
    }
    case "prepare_application": {
      const output: Record<string, unknown> = {
        jobId: input.payload.jobId,
      };

      if (input.payload.applicationId) {
        output.applicationId = input.payload.applicationId;
      }

      if (input.payload.resumeVersionId) {
        output.resumeVersionId = input.payload.resumeVersionId;
      } else {
        const resume = await generateTailoredResume(userId, input.payload.jobId);
        output.resumeVersionId = resume.id;
      }

      if (input.payload.coverLetterId) {
        output.coverLetterId = input.payload.coverLetterId;
      } else {
        const letter = await generateCoverLetter(
          userId,
          input.payload.jobId,
          "professional",
        );
        output.coverLetterId = letter.id;
      }

      if (input.payload.promptInstructions) {
        output.promptInstructions = input.payload.promptInstructions;
      }

      return output;
    }
    case "send_email": {
      const approval = await createApprovalRequest({
        userId,
        actionType: "send_email",
        resourceType: "application",
        resourceId: input.payload.applicationId,
        payload: input.payload,
        rationale: "n8n automation requested outbound email approval",
      });
      return { approvalId: approval.id, status: approval.status };
    }
    case "create_calendar_event": {
      const approval = await createApprovalRequest({
        userId,
        actionType: "create_calendar_event",
        resourceType: "application",
        resourceId: input.payload.applicationId,
        payload: input.payload,
        rationale: "n8n automation requested calendar event approval",
      });
      return { approvalId: approval.id, status: approval.status };
    }
    default: {
      const exhaustive: never = input;
      throw new Error(`Unsupported event: ${String(exhaustive)}`);
    }
  }
}

export async function POST(request: Request) {
  let workflowRunId: string | undefined;

  try {
    const rawBody = await request.text();
    const auth = authenticateAutomationRequest(request, rawBody);
    if (!auth.ok) {
      return auth.response;
    }

    const input = automationEventSchema.parse(JSON.parse(rawBody));
    const user = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const { run: workflow, duplicate } = await startWorkflowRun({
      userId: user.id,
      source: "n8n",
      eventType: input.event,
      idempotencyKey: input.idempotencyKey,
      inputPayload: input.payload,
    });

    if (duplicate) {
      return Response.json({
        duplicate: true,
        workflowRunId: workflow.id,
        status: workflow.status,
        output: workflow.outputPayload,
      });
    }

    workflowRunId = workflow.id;
    const output = await handleAutomationEvent(
      user.id,
      input,
      workflow.id,
    );

    await completeWorkflowRun(workflow.id, output);
    return Response.json({ workflowRunId: workflow.id, output });
  } catch (error) {
    if (error instanceof NotImplementedError) {
      if (workflowRunId) {
        await failWorkflowRun(workflowRunId, error.message);
      }
      return Response.json({ error: error.message }, { status: 501 });
    }

    const message =
      error instanceof z.ZodError
        ? "Invalid automation payload"
        : error instanceof Error
          ? error.message
          : "Workflow failed";

    if (workflowRunId) {
      await failWorkflowRun(workflowRunId, message);
    }

    return Response.json(
      {
        error: message,
        ...(error instanceof z.ZodError ? { issues: error.issues } : {}),
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}

export function GET() {
  return METHOD_NOT_ALLOWED;
}

export function PUT() {
  return METHOD_NOT_ALLOWED;
}

export function PATCH() {
  return METHOD_NOT_ALLOWED;
}

export function DELETE() {
  return METHOD_NOT_ALLOWED;
}
