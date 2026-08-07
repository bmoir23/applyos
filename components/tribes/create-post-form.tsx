"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createTribePostAction } from "@/app/(app)/tribes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CreateTribePostFormProps = {
  tribeId: string;
  tribeSlug: string;
};

export function CreateTribePostForm({ tribeId, tribeSlug }: CreateTribePostFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await createTribePostAction({
      tribeId,
      tribeSlug,
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
    setPending(false);

    if (!result.success) {
      toast.error(result.error ?? "Unable to create post");
      return;
    }

    toast.success("Post published");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={255} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="body">Body</Label>
        <Textarea id="body" name="body" required rows={5} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Publishing..." : "Publish post"}
      </Button>
    </form>
  );
}
