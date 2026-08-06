"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  saveProfileAction,
  type SaveProfileResult,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import {
  profileEditorSchema,
  type ProfileEditorInput,
  type ProfileFormValues,
} from "@/lib/validators";

type ProfileFormProps = {
  initialValues: ProfileEditorInput;
  isOnboarding: boolean;
};

export function ProfileForm({
  initialValues,
  isOnboarding,
}: ProfileFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileEditorInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileEditorSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(values: ProfileFormValues) {
    const result: SaveProfileResult = await saveProfileAction(values);
    if (!result.success) {
      toast.error(result.error ?? "Unable to save profile");
      return;
    }
    toast.success(isOnboarding ? "Profile ready" : "Profile updated");
    if (isOnboarding) {
      window.location.assign("/dashboard");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Career targets</CardTitle>
            <CardDescription>
              Used to rank roles and filter recommendations. Separate multiple
              entries with commas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.targetRolesText)}>
                <FieldLabel htmlFor="targetRolesText">Target roles</FieldLabel>
                <Input
                  id="targetRolesText"
                  placeholder="Product engineer, full-stack engineer"
                  aria-invalid={Boolean(errors.targetRolesText)}
                  {...register("targetRolesText")}
                />
                <FieldError errors={[errors.targetRolesText]} />
              </Field>

              <Field data-invalid={Boolean(errors.targetLocationsText)}>
                <FieldLabel htmlFor="targetLocationsText">
                  Target locations
                </FieldLabel>
                <Input
                  id="targetLocationsText"
                  placeholder="Remote, New York, Toronto"
                  aria-invalid={Boolean(errors.targetLocationsText)}
                  {...register("targetLocationsText")}
                />
                <FieldError errors={[errors.targetLocationsText]} />
              </Field>

              <Controller
                control={control}
                name="remotePreference"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Remote preference</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="any">Any arrangement</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-3">
                <Field data-invalid={Boolean(errors.salaryMin)}>
                  <FieldLabel htmlFor="salaryMin">Minimum salary</FieldLabel>
                  <Input
                    id="salaryMin"
                    inputMode="numeric"
                    placeholder="120000"
                    aria-invalid={Boolean(errors.salaryMin)}
                    {...register("salaryMin")}
                  />
                  <FieldError errors={[errors.salaryMin]} />
                </Field>
                <Field data-invalid={Boolean(errors.salaryMax)}>
                  <FieldLabel htmlFor="salaryMax">Maximum salary</FieldLabel>
                  <Input
                    id="salaryMax"
                    inputMode="numeric"
                    placeholder="160000"
                    aria-invalid={Boolean(errors.salaryMax)}
                    {...register("salaryMax")}
                  />
                  <FieldError errors={[errors.salaryMax]} />
                </Field>
                <Field data-invalid={Boolean(errors.salaryCurrency)}>
                  <FieldLabel htmlFor="salaryCurrency">Currency</FieldLabel>
                  <Input
                    id="salaryCurrency"
                    maxLength={3}
                    aria-invalid={Boolean(errors.salaryCurrency)}
                    {...register("salaryCurrency")}
                  />
                  <FieldError errors={[errors.salaryCurrency]} />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your background</CardTitle>
            <CardDescription>
              ApplyOS only uses facts you provide. It never invents experience
              or qualifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.skillsText)}>
                <FieldLabel htmlFor="skillsText">Skills</FieldLabel>
                <Input
                  id="skillsText"
                  placeholder="TypeScript, React, Postgres"
                  aria-invalid={Boolean(errors.skillsText)}
                  {...register("skillsText")}
                />
                <FieldDescription>
                  Use only skills you can confidently discuss in an interview.
                </FieldDescription>
                <FieldError errors={[errors.skillsText]} />
              </Field>

              <Field data-invalid={Boolean(errors.experienceSummary)}>
                <FieldLabel htmlFor="experienceSummary">
                  Experience summary
                </FieldLabel>
                <Textarea
                  id="experienceSummary"
                  rows={5}
                  aria-invalid={Boolean(errors.experienceSummary)}
                  {...register("experienceSummary")}
                />
                <FieldError errors={[errors.experienceSummary]} />
              </Field>

              <Field data-invalid={Boolean(errors.workAuthorizationNotes)}>
                <FieldLabel htmlFor="workAuthorizationNotes">
                  Work authorization
                </FieldLabel>
                <Textarea
                  id="workAuthorizationNotes"
                  rows={3}
                  placeholder="Optional notes about authorization or sponsorship needs"
                  aria-invalid={Boolean(errors.workAuthorizationNotes)}
                  {...register("workAuthorizationNotes")}
                />
                <FieldError errors={[errors.workAuthorizationNotes]} />
              </Field>

              <Field data-invalid={Boolean(errors.baseResumeText)}>
                <FieldLabel htmlFor="baseResumeText">
                  Base resume text
                </FieldLabel>
                <Textarea
                  id="baseResumeText"
                  rows={16}
                  placeholder="Paste the full text of your resume"
                  aria-invalid={Boolean(errors.baseResumeText)}
                  {...register("baseResumeText")}
                />
                <FieldDescription>
                  Dates, employers, titles, education, and metrics are preserved
                  as source-of-truth facts.
                </FieldDescription>
                <FieldError errors={[errors.baseResumeText]} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application preferences</CardTitle>
            <CardDescription>
              Optional guidance for drafts and opportunity prioritization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={control}
                name="preferredCoverLetterTone"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Cover letter tone</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="enthusiastic">
                            Enthusiastic
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Field data-invalid={Boolean(errors.applicationPreferences)}>
                <FieldLabel htmlFor="applicationPreferences">
                  Other preferences
                </FieldLabel>
                <Textarea
                  id="applicationPreferences"
                  rows={4}
                  placeholder="Industries, company stages, travel limits, or other preferences"
                  aria-invalid={Boolean(errors.applicationPreferences)}
                  {...register("applicationPreferences")}
                />
                <FieldError errors={[errors.applicationPreferences]} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving…"
              : isOnboarding
                ? "Complete onboarding"
                : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
