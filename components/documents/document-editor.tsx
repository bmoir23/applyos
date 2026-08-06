"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { updateDocumentAction } from "@/app/(app)/jobs/[jobId]/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type DocumentEditorProps = {
  documentType: "resume" | "cover_letter";
  documentId: string;
  title: string;
  changeSummary: string | null;
  initialMarkdown: string;
  approved: boolean;
};

export function DocumentEditor({
  documentType,
  documentId,
  title,
  changeSummary,
  initialMarkdown,
  approved,
}: DocumentEditorProps) {
  const router = useRouter();
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    const result = await updateDocumentAction({
      documentType,
      documentId,
      markdown,
    });
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "Unable to update document");
      return;
    }
    toast.success("Draft saved; review approval is required again");
    setIsEditing(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              {title} · {approved ? "Approved" : "Draft"}
            </CardTitle>
            {changeSummary && (
              <CardDescription>{changeSummary}</CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing((value) => !value)}
          >
            {isEditing ? "Preview" : "Edit Markdown"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isEditing ? (
          <>
            <Textarea
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              rows={22}
              aria-label={`Edit ${title}`}
            />
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save draft"}
            </Button>
          </>
        ) : (
          <article className="text-sm leading-7">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </article>
        )}
      </CardContent>
    </Card>
  );
}
