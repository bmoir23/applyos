import type { Metadata } from "next";

import { ApprovalDecisionButtons } from "@/components/approvals/decision-buttons";
import { FeatureGate } from "@/components/feature-gate";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboardedAppUser } from "@/lib/auth";
import { listPendingApprovals } from "@/lib/services/approvals";

export const metadata: Metadata = {
  title: "Approvals",
};

function formatActionType(actionType: string) {
  return actionType.replaceAll("_", " ");
}

export default async function ApprovalsPage() {
  const { appUser } = await requireOnboardedAppUser();
  const approvals = await listPendingApprovals(appUser.id);

  return (
    <FeatureGate
      flag="hitl_workspace"
      title="Approvals workspace disabled"
      description="Enable hitl_workspace to review and decide pending agent actions."
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review pending actions before ApplyOS performs sensitive steps on your
            behalf.
          </p>
        </div>

        {approvals.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>All caught up</CardTitle>
              <CardDescription>
                No pending approvals. New requests appear here when workflows need
                your decision.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {approvals.map((approval) => (
              <Card key={approval.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="capitalize">
                        {formatActionType(approval.actionType)}
                      </CardTitle>
                      <CardDescription>
                        {approval.resourceType}
                        {approval.resourceId
                          ? ` · ${approval.resourceId.slice(0, 8)}`
                          : ""}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {approval.rationale && (
                    <p className="text-sm text-muted-foreground">
                      {approval.rationale}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Requested {approval.createdAt.toLocaleString()}
                  </p>
                  <ApprovalDecisionButtons approvalId={approval.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
