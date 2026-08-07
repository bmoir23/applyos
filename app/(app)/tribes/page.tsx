import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { FeatureGate } from "@/components/feature-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboardedAppUser } from "@/lib/auth";
import { listMemberships, listTribes } from "@/lib/services/tribes";

export const metadata: Metadata = {
  title: "Tribes",
};

export default async function TribesPage() {
  const { appUser } = await requireOnboardedAppUser();
  const [tribes, memberships] = await Promise.all([
    listTribes(),
    listMemberships(appUser.id),
  ]);
  const membershipByTribe = new Map(
    memberships.map((membership) => [membership.tribeId, membership]),
  );

  return (
    <FeatureGate
      flag="tribes"
      title="Tribes disabled"
      description="Enable the tribes feature flag to browse peer communities after hire."
    >
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tribes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Peer communities unlock after hire. Browse tribes and see where you belong.
        </p>
      </div>

      {tribes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No tribes yet</CardTitle>
            <CardDescription>
              Tribe seeds load from database migrations. Run migrations if this list is empty.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tribes.map((tribe) => {
            const membership = membershipByTribe.get(tribe.id);
            return (
              <Card key={tribe.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="size-4" />
                      {tribe.name}
                    </CardTitle>
                    {membership ? (
                      <Badge variant="secondary">Member</Badge>
                    ) : (
                      <Badge variant="outline">Locked</Badge>
                    )}
                  </div>
                  <CardDescription>{tribe.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    render={<Link href={`/tribes/${tribe.slug}`} />}
                    variant="outline"
                    size="sm"
                    disabled={!membership}
                  >
                    {membership ? "Open tribe" : "Join after hire"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </FeatureGate>
  );
}
