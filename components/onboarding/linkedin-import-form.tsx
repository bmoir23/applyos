"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LinkedInImportForm() {
  const router = useRouter();
  const [linkedinUrl, setLinkedInUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) {
      toast.error("Confirm this is your public profile URL");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/profile/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "linkedin",
          linkedinUrl,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        ingestion?: { mode?: string; fullName?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to import LinkedIn profile");
      }

      if (payload.ingestion?.mode === "mock") {
        toast.message("Mock LinkedIn import loaded", {
          description:
            "Review imported sample fields. Configure Firecrawl for live extraction.",
        });
      } else {
        toast.success(
          payload.ingestion?.fullName
            ? `Imported profile for ${payload.ingestion.fullName}`
            : "LinkedIn profile imported",
        );
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to import LinkedIn profile",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from LinkedIn</CardTitle>
        <CardDescription>
          Optional shortcut to prefill skills and experience from a public
          profile URL. You can still edit everything before saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="linkedinUrl">Public profile URL</FieldLabel>
              <Input
                id="linkedinUrl"
                type="url"
                placeholder="https://www.linkedin.com/in/your-name"
                value={linkedinUrl}
                onChange={(event) => setLinkedInUrl(event.target.value)}
                required
              />
              <FieldDescription>
                Only public profile pages are supported. Private or authenticated
                URLs are blocked.
              </FieldDescription>
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="linkedinConsent"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <FieldLabel htmlFor="linkedinConsent" className="font-normal">
                I confirm this is my public profile URL
              </FieldLabel>
            </Field>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting || !linkedinUrl || !confirmed}
              >
                {isSubmitting ? "Importing…" : "Import profile"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
