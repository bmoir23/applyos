"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  attachCoverLetterAction,
  createApplicationAction,
} from "@/app/(app)/applications/actions";
import { Button } from "@/components/ui/button";

type JobActionsProps = {
  jobId: string;
  applicationId?: string;
  approvedResumeVersionId?: string;
  resumeDrafts: Array<{
    id: string;
    label: string;
    approved: boolean;
  }>;
  coverLetters: Array<{
    id: string;
    label: string;
    approved: boolean;
    attached: boolean;
  }>;
};

function readPayloadError(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return "The request failed";
}

export function JobActions({
  jobId,
  applicationId,
  approvedResumeVersionId,
  resumeDrafts,
  coverLetters,
}: JobActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function post(path: string, body: Record<string, unknown>, label: string) {
    setPending(label);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readPayloadError(payload));
      toast.success(label);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setPending(null);
    }
  }

  async function addToPipeline() {
    setPending("Adding to pipeline");
    const result = await createApplicationAction({
      jobId,
      resumeVersionId: approvedResumeVersionId,
    });
    setPending(null);
    if (!result.success || !result.data) {
      toast.error(result.error ?? "Unable to create application");
      return;
    }
    router.push(`/applications/${result.data.applicationId}`);
  }

  async function attachLetter(coverLetterId: string) {
    if (!applicationId) return;
    setPending("Attaching cover letter");
    const result = await attachCoverLetterAction({
      applicationId,
      coverLetterId,
    });
    setPending(null);
    if (!result.success) {
      toast.error(result.error ?? "Unable to attach cover letter");
      return;
    }
    toast.success("Cover letter attached");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            post("/api/jobs/score", { jobId }, "Match score updated")
          }
          disabled={pending !== null}
        >
          {pending === "Match score updated" ? "Scoring…" : "Score match"}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            post(
              "/api/documents/resume",
              { jobId },
              "Tailored resume draft created",
            )
          }
          disabled={pending !== null}
        >
          Generate resume draft
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            post(
              "/api/documents/cover-letter",
              { jobId, tone: "professional" },
              "Cover letter draft created",
            )
          }
          disabled={pending !== null}
        >
          Generate cover letter
        </Button>
        {applicationId ? (
          <Button
            variant="secondary"
            onClick={() => router.push(`/applications/${applicationId}`)}
          >
            View application
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={addToPipeline}
            disabled={pending !== null}
          >
            Add to pipeline
          </Button>
        )}
      </div>

      {[...resumeDrafts, ...coverLetters].length > 0 && (
        <div className="flex flex-col gap-2">
          {[...resumeDrafts, ...coverLetters].map((document) => {
            const documentType = resumeDrafts.some(
              (resume) => resume.id === document.id,
            )
              ? "resume"
              : "cover_letter";
            const isAttached =
              "attached" in document && document.attached === true;
            return (
              <div
                key={`${documentType}-${document.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <span>
                  {document.label} ·{" "}
                  {document.approved ? "Approved" : "Needs approval"}
                </span>
                {!document.approved && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() =>
                      post(
                        "/api/documents/approve",
                        { documentType, documentId: document.id },
                        "Document approved",
                      )
                    }
                  >
                    Review and approve
                  </Button>
                )}
                {documentType === "cover_letter" &&
                  applicationId &&
                  document.approved &&
                  "attached" in document && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isAttached || pending !== null}
                      onClick={() => attachLetter(document.id)}
                    >
                      {isAttached ? "Attached" : "Attach"}
                    </Button>
                  )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
