"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  approveExternalSubmissionAction,
  updateApplicationAction,
} from "@/app/(app)/applications/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationStatus } from "@/lib/validators";

const statuses: ApplicationStatus[] = [
  "interested",
  "preparing",
  "applied",
  "interviewing",
  "assessment",
  "offer",
  "rejected",
  "withdrawn",
  "archived",
];

type ApplicationEditorProps = {
  applicationId: string;
  initialStatus: ApplicationStatus;
  initialNotes: string;
  initialFollowUpAt: string;
  externalSubmissionApproved: boolean;
};

export function ApplicationEditor({
  applicationId,
  initialStatus,
  initialNotes,
  initialFollowUpAt,
  externalSubmissionApproved,
}: ApplicationEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function save(formData: FormData) {
    setIsSubmitting(true);
    const followUpValue = String(formData.get("followUpAt") ?? "");
    const result = await updateApplicationAction({
      applicationId,
      status,
      notes: String(formData.get("notes") ?? ""),
      followUpAt: followUpValue
        ? new Date(followUpValue).toISOString()
        : null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Unable to update application");
      return;
    }
    toast.success("Application updated");
    router.refresh();
  }

  async function approveExternalStep() {
    const confirmed = window.confirm(
      "This records your approval for a future external submission step. ApplyOS will not submit the application or send anything now. Continue?",
    );
    if (!confirmed) return;

    const result = await approveExternalSubmissionAction({ applicationId });
    if (!result.success) {
      toast.error(result.error ?? "Unable to record approval");
      return;
    }
    toast.success("Approval recorded; no external action was taken");
    router.refresh();
  }

  return (
    <form action={save}>
      <FieldGroup>
        <Field>
          <FieldLabel>Status</FieldLabel>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as ApplicationStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statuses.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="followUpAt">Follow up</FieldLabel>
          <Input
            id="followUpAt"
            name="followUpAt"
            type="datetime-local"
            defaultValue={initialFollowUpAt}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            rows={6}
            defaultValue={initialNotes}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save application"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={approveExternalStep}
            disabled={externalSubmissionApproved}
          >
            {externalSubmissionApproved
              ? "External step approved"
              : "Approve future external step"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
