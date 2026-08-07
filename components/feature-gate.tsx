import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/env";

type FeatureGateProps = {
  flag: FeatureFlag;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function FeatureGate({
  flag,
  title,
  description,
  children,
}: FeatureGateProps) {
  if (isFeatureEnabled(flag)) {
    return children;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          This surface is gated behind the{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{flag}</code>{" "}
          feature flag.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
