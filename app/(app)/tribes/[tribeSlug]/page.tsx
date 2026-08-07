import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";

import { CreateTribePostForm } from "@/components/tribes/create-post-form";
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
import {
  getTribeBySlug,
  listMemberships,
  listTribePosts,
} from "@/lib/services/tribes";

type TribeDetailPageProps = {
  params: Promise<{ tribeSlug: string }>;
};

export async function generateMetadata({
  params,
}: TribeDetailPageProps): Promise<Metadata> {
  const { tribeSlug } = await params;
  const tribe = await getTribeBySlug(tribeSlug);
  return { title: tribe?.name ?? "Tribe" };
}

export default async function TribeDetailPage({ params }: TribeDetailPageProps) {
  const { tribeSlug } = await params;
  const { appUser } = await requireOnboardedAppUser();
  const tribe = await getTribeBySlug(tribeSlug);
  if (!tribe) {
    notFound();
  }

  const [memberships, posts] = await Promise.all([
    listMemberships(appUser.id),
    listTribePosts(tribe.id),
  ]);
  const isMember = memberships.some(
    (membership) => membership.tribeId === tribe.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          render={<Link href="/tribes" />}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="size-4" />
          Back to tribes
        </Button>
        {isMember ? (
          <Badge variant="secondary">Member</Badge>
        ) : (
          <Badge variant="outline">Members only</Badge>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tribe.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tribe.description}</p>
      </div>

      {isMember ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a post</CardTitle>
            <CardDescription>
              Share wins, questions, or resources with your tribe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTribePostForm tribeId={tribe.id} tribeSlug={tribe.slug} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            Posts
          </CardTitle>
          <CardDescription>
            {posts.length === 0
              ? "No posts yet."
              : `${posts.length} post${posts.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isMember
                ? "Be the first to start a conversation."
                : "Join this tribe after hire to read and create posts."}
            </p>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className="rounded-lg border p-4"
              >
                <h2 className="font-medium">{post.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {post.createdAt.toLocaleString()}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {post.bodyMarkdown}
                </p>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
