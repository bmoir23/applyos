import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { coverLetters, resumeVersions } from "@/db/schema";
import { requireAppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildResumeExportFilename,
  buildTextExportFilename,
  markdownToPlainText,
  plainTextToPdf,
} from "@/lib/export/pdf";

const exportSchema = z.object({
  documentType: z.enum(["resume", "cover_letter"]),
  documentId: z.uuid(),
  format: z.enum(["pdf", "text"]),
});

async function getOwnedDocumentMarkdown(
  userId: string,
  documentType: "resume" | "cover_letter",
  documentId: string,
) {
  if (documentType === "resume") {
    const version = await db.query.resumeVersions.findFirst({
      where: eq(resumeVersions.id, documentId),
      with: { resume: true },
    });
    if (!version || version.resume.userId !== userId) {
      throw new Error("Document not found");
    }
    return {
      title: version.versionLabel,
      markdown: version.contentMarkdown,
    };
  }

  const letter = await db.query.coverLetters.findFirst({
    where: and(
      eq(coverLetters.id, documentId),
      eq(coverLetters.userId, userId),
    ),
  });
  if (!letter) {
    throw new Error("Document not found");
  }
  return {
    title: letter.title,
    markdown: letter.contentMarkdown,
  };
}

function exportResponse(
  title: string,
  markdown: string,
  format: "pdf" | "text",
) {
  const plainText = markdownToPlainText(markdown);

  if (format === "text") {
    return new Response(plainText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildTextExportFilename(title)}"`,
      },
    });
  }

  const pdf = plainTextToPdf(plainText);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildResumeExportFilename(title)}"`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const appUser = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const input = exportSchema.parse({
      documentType: searchParams.get("documentType"),
      documentId: searchParams.get("documentId"),
      format: searchParams.get("format") ?? "pdf",
    });
    const document = await getOwnedDocumentMarkdown(
      appUser.id,
      input.documentType,
      input.documentId,
    );
    return exportResponse(document.title, document.markdown, input.format);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to export document",
      },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 404 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const appUser = await requireAppUser();
    const input = exportSchema.parse(await request.json());
    const document = await getOwnedDocumentMarkdown(
      appUser.id,
      input.documentType,
      input.documentId,
    );
    return exportResponse(document.title, document.markdown, input.format);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to export document",
      },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 404 },
    );
  }
}
