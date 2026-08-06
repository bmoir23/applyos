"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { applyEmailSuggestionAction } from "@/app/(app)/applications/actions";
import { Button } from "@/components/ui/button";

type EmailSuggestionProps = {
  emailMessageId: string;
  suggestedStatus: string;
  confidence: number | null;
  applied: boolean;
};

export function EmailSuggestion({
  emailMessageId,
  suggestedStatus,
  confidence,
  applied,
}: EmailSuggestionProps) {
  const router = useRouter();

  async function applySuggestion() {
    const result = await applyEmailSuggestionAction({ emailMessageId });
    if (!result.success) {
      toast.error(result.error ?? "Unable to apply suggestion");
      return;
    }
    toast.success("Status suggestion approved");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm">
        Suggested status: <strong>{suggestedStatus}</strong>
        {confidence !== null ? ` · ${confidence}% confidence` : ""}
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={applySuggestion}
        disabled={applied}
      >
        {applied ? "Applied" : "Approve suggestion"}
      </Button>
    </div>
  );
}
