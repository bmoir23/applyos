"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createJobSourceAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  jobSourceInputSchema,
  type JobSourceInput,
} from "@/lib/validators";

export function JobSourceForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JobSourceInput>({
    resolver: zodResolver(jobSourceInputSchema),
    defaultValues: { label: "", sourceUrl: "" },
  });

  async function onSubmit(values: JobSourceInput) {
    const created = await createJobSourceAction(values);
    if (!created.success) {
      toast.error(created.error);
      return;
    }

    toast.loading("Crawling career page…", { id: "crawl-source" });
    const response = await fetch("/api/jobs/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobSourceId: created.jobSourceId }),
    });

    if (!response.ok) {
      toast.error("The source was saved, but the crawl failed.", {
        id: "crawl-source",
      });
      router.refresh();
      return;
    }

    toast.success("Jobs imported", { id: "crawl-source" });
    reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] md:items-end">
          <Field data-invalid={Boolean(errors.label)}>
            <FieldLabel htmlFor="source-label">Source name</FieldLabel>
            <Input
              id="source-label"
              placeholder="Acme careers"
              aria-invalid={Boolean(errors.label)}
              {...register("label")}
            />
            <FieldError errors={[errors.label]} />
          </Field>
          <Field data-invalid={Boolean(errors.sourceUrl)}>
            <FieldLabel htmlFor="source-url">Public career page URL</FieldLabel>
            <Input
              id="source-url"
              type="url"
              placeholder="https://company.com/careers"
              aria-invalid={Boolean(errors.sourceUrl)}
              {...register("sourceUrl")}
            />
            <FieldError errors={[errors.sourceUrl]} />
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add and crawl"}
          </Button>
        </div>
        <FieldDescription>
          Only add public pages you are allowed to access. ApplyOS blocks local
          and private network addresses.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
