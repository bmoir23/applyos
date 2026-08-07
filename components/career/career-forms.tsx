"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  createAchievementAction,
  createCompensationAction,
  generate306090PlanAction,
} from "@/app/(app)/career/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function GeneratePlanButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function generatePlan() {
    setPending(true);
    const result = await generate306090PlanAction();
    setPending(false);

    if (!result.success) {
      toast.error(result.error ?? "Unable to generate plan");
      return;
    }

    toast.success("30/60/90 plan generated");
    router.refresh();
  }

  return (
    <Button onClick={generatePlan} disabled={pending} variant="outline" size="sm">
      {pending ? "Generating..." : "Generate 30/60/90 plan"}
    </Button>
  );
}

export function AchievementForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await createAchievementAction({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
      evidenceUrl: String(formData.get("evidenceUrl") ?? "") || undefined,
    });
    setPending(false);

    if (!result.success) {
      toast.error(result.error ?? "Unable to add achievement");
      return;
    }

    toast.success("Achievement added");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="achievement-title">Title</Label>
        <Input id="achievement-title" name="title" required maxLength={255} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="achievement-description">Description</Label>
        <Textarea id="achievement-description" name="description" rows={3} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="achievement-evidence">Evidence URL</Label>
        <Input id="achievement-evidence" name="evidenceUrl" type="url" />
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving..." : "Add achievement"}
      </Button>
    </form>
  );
}

export function CompensationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await createCompensationAction({
      title: String(formData.get("title") ?? ""),
      amountCents: Number(formData.get("amountCents") ?? 0),
      currency: String(formData.get("currency") ?? "USD") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
    });
    setPending(false);

    if (!result.success) {
      toast.error(result.error ?? "Unable to add compensation entry");
      return;
    }

    toast.success("Compensation entry added");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="comp-title">Title</Label>
        <Input id="comp-title" name="title" required maxLength={255} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="comp-amount">Amount (cents)</Label>
          <Input
            id="comp-amount"
            name="amountCents"
            type="number"
            min={1}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="comp-currency">Currency</Label>
          <Input id="comp-currency" name="currency" defaultValue="USD" maxLength={3} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="comp-notes">Notes</Label>
        <Textarea id="comp-notes" name="notes" rows={2} />
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving..." : "Add compensation entry"}
      </Button>
    </form>
  );
}
