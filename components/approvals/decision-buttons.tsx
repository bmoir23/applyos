"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { decideApprovalAction } from "@/app/(app)/approvals/actions";
import { Button } from "@/components/ui/button";

type ApprovalDecisionButtonsProps = {
  approvalId: string;
};

export function ApprovalDecisionButtons({
  approvalId,
}: ApprovalDecisionButtonsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);

  async function decide(decision: "approved" | "rejected") {
    setPending(decision);
    const result = await decideApprovalAction({ approvalId, decision });
    setPending(null);
    if (!result.success) {
      toast.error(result.error ?? "Unable to record decision");
      return;
    }
    toast.success(decision === "approved" ? "Approved" : "Rejected");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={() => decide("approved")}
        disabled={pending !== null}
      >
        {pending === "approved" ? "Approving…" : "Approve"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => decide("rejected")}
        disabled={pending !== null}
      >
        {pending === "rejected" ? "Rejecting…" : "Reject"}
      </Button>
    </div>
  );
}
