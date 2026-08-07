"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { updateDocumentAction } from "@/app/(app)/jobs/[jobId]/actions";
import { ExportButtons } from "@/components/hitl/export-buttons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ReviewDocument = {
  documentType: "resume" | "cover_letter";
  documentId: string;
  title: string;
  markdown: string;
  approved: boolean;
  changeSummary?: string | null;
};

type ReviewWorkspaceProps = {
  jobTitle: string;
  companyName: string;
  jobMarkdown: string;
  resume?: ReviewDocument;
  coverLetter?: ReviewDocument;
  packetId?: string;
};

function ReviewDocumentPanel({ document }: { document: ReviewDocument }) {
  const router = useRouter();
  const [markdown, setMarkdown] = useState(document.markdown);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  async function saveDraft() {
    setIsSaving(true);
    const result = await updateDocumentAction({
      documentType: document.documentType,
      documentId: document.documentId,
      markdown,
    });
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "Unable to save draft");
      return;
    }
    toast.success("Draft saved");
    setIsEditing(false);
    router.refresh();
  }

  async function approveDocument() {
    setIsApproving(true);
    try {
      const response = await fetch("/api/documents/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: document.documentType,
          documentId: document.documentId,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : "Unable to approve document",
        );
      }
      toast.success("Document approved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval failed");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{document.title}</p>
          <p className="text-sm text-muted-foreground">
            {document.approved ? "Approved" : "Needs your approval"}
          </p>
          {document.changeSummary && (
            <p className="mt-1 text-sm text-muted-foreground">
              {document.changeSummary}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsEditing((value) => !value)}
        >
          {isEditing ? "Preview" : "Edit"}
        </Button>
      </div>

      {isEditing ? (
        <>
          <Textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            rows={18}
            aria-label={`Edit ${document.title}`}
          />
          <Button type="button" onClick={saveDraft} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save draft"}
          </Button>
        </>
      ) : (
        <article className="rounded-lg border p-4 text-sm leading-7">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!document.approved && (
          <Button
            type="button"
            onClick={approveDocument}
            disabled={isApproving || isEditing}
          >
            {isApproving ? "Approving…" : "Approve"}
          </Button>
        )}
        <ExportButtons
          documentType={document.documentType}
          documentId={document.documentId}
          disabled={isEditing}
        />
      </div>
    </div>
  );
}

export function ReviewWorkspace({
  jobTitle,
  companyName,
  jobMarkdown,
  resume,
  coverLetter,
  packetId,
}: ReviewWorkspaceProps) {
  const defaultTab = resume ? "resume" : "cover";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review workspace</CardTitle>
        <CardDescription>
          Human-in-the-loop review for {jobTitle} at {companyName}.
          {packetId ? ` Packet ${packetId.slice(0, 8)}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-label="Job summary">
            <h3 className="mb-2 text-sm font-medium">Job summary</h3>
            <article className="max-h-[32rem] overflow-y-auto rounded-lg border p-4 text-sm leading-7">
              <ReactMarkdown>{jobMarkdown}</ReactMarkdown>
            </article>
          </section>

          <section aria-label="Application documents">
            {!resume && !coverLetter ? (
              <p className="text-sm text-muted-foreground">
                Generate a resume or cover letter draft to start review.
              </p>
            ) : (
              <Tabs defaultValue={defaultTab}>
                <TabsList>
                  {resume && <TabsTrigger value="resume">Resume</TabsTrigger>}
                  {coverLetter && (
                    <TabsTrigger value="cover">Cover letter</TabsTrigger>
                  )}
                </TabsList>
                {resume && (
                  <TabsContent value="resume" className="mt-4">
                    <ReviewDocumentPanel document={resume} />
                  </TabsContent>
                )}
                {coverLetter && (
                  <TabsContent value="cover" className="mt-4">
                    <ReviewDocumentPanel document={coverLetter} />
                  </TabsContent>
                )}
              </Tabs>
            )}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
