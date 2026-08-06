import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PlaceholderPageProps = {
  title: string;
  description: string;
  phaseHint?: string;
};

export function PlaceholderPage({
  title,
  description,
  phaseHint,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            {phaseHint ??
              "This surface will be wired in a later MVP phase."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You are authenticated. Foundation routing and navigation are ready.
        </CardContent>
      </Card>
    </div>
  );
}
