const PLAIN_TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown"]);

const BINARY_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function assertUploadSize(byteLength: number, maxBytes = 2_000_000) {
  if (byteLength > maxBytes) {
    throw new Error(
      `Upload exceeds the ${Math.round(maxBytes / 1_000_000)}MB limit`,
    );
  }
}

export function extractPlainText(buffer: Buffer, mimeType: string) {
  const normalizedMime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";

  if (PLAIN_TEXT_MIME_TYPES.has(normalizedMime)) {
    return normalizeResumeText(buffer.toString("utf8"));
  }

  if (BINARY_DOCUMENT_MIME_TYPES.has(normalizedMime)) {
    throw new Error(
      "PDF and DOCX parsing is not available in this build. Paste resume text directly or import a public LinkedIn profile with Firecrawl.",
    );
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

export function normalizeResumeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
