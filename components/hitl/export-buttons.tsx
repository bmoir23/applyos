"use client";

import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ExportButtonsProps = {
  documentType: "resume" | "cover_letter";
  documentId: string;
  disabled?: boolean;
};

function buildExportUrl(
  documentType: "resume" | "cover_letter",
  documentId: string,
  format: "pdf" | "text",
) {
  const params = new URLSearchParams({
    documentType,
    documentId,
    format,
  });
  return `/api/documents/export?${params.toString()}`;
}

export function ExportButtons({
  documentType,
  documentId,
  disabled = false,
}: ExportButtonsProps) {
  const [pending, setPending] = useState<"pdf" | "text" | null>(null);

  async function download(format: "pdf" | "text") {
    setPending(format);
    try {
      const response = await fetch(buildExportUrl(documentType, documentId, format));
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Export failed";
        throw new Error(message);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `export.${format === "pdf" ? "pdf" : "txt"}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${format === "pdf" ? "PDF" : "text"} export`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || pending !== null}
        onClick={() => download("pdf")}
      >
        <Download className="size-4" />
        {pending === "pdf" ? "Exporting…" : "Export PDF"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || pending !== null}
        onClick={() => download("text")}
      >
        <FileText className="size-4" />
        {pending === "text" ? "Exporting…" : "Export text"}
      </Button>
    </div>
  );
}
