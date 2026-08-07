import type { Metadata } from "next";
import { Inbox, Mail, SendHorizonal } from "lucide-react";

import { FeatureGate } from "@/components/feature-gate";
import { ThreadList } from "@/components/inbox/thread-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboardedAppUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/env";
import { getEmailIdentity, provisionEmailIdentity } from "@/lib/services/email-identity";
import { listInbox } from "@/lib/services/emailMessages";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function InboxPage() {
  const { appUser } = await requireOnboardedAppUser();

  if (!isFeatureEnabled("inbox")) {
    return (
      <FeatureGate
        flag="inbox"
        title="Inbox disabled"
        description="Enable the inbox feature flag to provision email identities and review messages."
      >
        {null}
      </FeatureGate>
    );
  }

  let identity = await getEmailIdentity(appUser.id);
  if (!identity) {
    identity = await provisionEmailIdentity(appUser.id);
  }

  const { messages, pendingDrafts } = await listInbox(appUser.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Application email routed through your ApplyOS identity. Outbound sends
          require approval before delivery.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" />
            Your ApplyOS address
          </CardTitle>
          <CardDescription>
            Share this address on applications so recruiters reach your inbox here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm">{identity.displayAddress}</p>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="size-4" />
              Inbound messages
            </CardTitle>
            <CardDescription>
              {messages.length === 0
                ? "No inbound mail yet."
                : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                When someone emails your ApplyOS address, messages appear here for
                review and optional status classification.
              </p>
            ) : (
              <ThreadList
                items={messages.map((message) => ({
                  id: message.id,
                  subject: message.subject ?? "(No subject)",
                  preview: message.bodyText?.slice(0, 140) ?? "",
                  fromAddress: message.fromAddress,
                  receivedAt: message.receivedAt?.toISOString() ?? null,
                  classifiedStatus: message.classifiedStatus,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SendHorizonal className="size-4" />
              Pending draft sends
            </CardTitle>
            <CardDescription>
              {pendingDrafts.length === 0
                ? "No drafts awaiting approval."
                : `${pendingDrafts.length} draft${pendingDrafts.length === 1 ? "" : "s"} pending`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingDrafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Draft replies from applications will show here until you approve
                sending through Resend.
              </p>
            ) : (
              <ThreadList
                items={pendingDrafts.map((message) => ({
                  id: message.id,
                  subject: message.draftSubject ?? message.subject ?? "(No subject)",
                  preview: message.draftBodyText?.slice(0, 140) ?? "",
                  fromAddress: message.toAddress,
                  receivedAt: message.createdAt.toISOString(),
                  classifiedStatus: null,
                  badge: "Awaiting approval",
                }))}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
