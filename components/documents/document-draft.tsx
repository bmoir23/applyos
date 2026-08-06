"use client";

import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DocumentDraftProps = {
  documentType: "resume" | "cover_letter";
  documentId: string;
  title: string;
  markdown: string;
  changeSummary: string | null;
  approved: boolean;
};

export function DocumentDraft({
  documentType,
  documentId,
  title,
  markdown,
  changeSummary,
  approved,
}: DocumentDraftProps) {
  const router = useRouter();
  const endpoint =
    documentType === "resume"
      ? "/api/documents/resume"
      : "/api/documents/cover-letter";

  async function approve() {
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType, documentId }),
    });
    if (!response.ok) {
      toast.error("Unable to approve this draft");
      return;
    }
    toast.success("Draft approved for application use");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {changeSummary ?? "No change summary provided."}
            </CardDescription>
          </div>
          <Badge variant={approved ? "default" : "secondary"}>
            {approved ? "Approved" : "Review required"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[32rem] overflow-y-auto rounded-lg bg-muted/40 p-5 text-sm leading-7">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </CardContent>
      {!approved && (
        <CardFooter className="justify-end">
          <Button onClick={approve}>Approve this draft</Button>
        </CardFooter>
      )}
    </Card>
  );
}
