import {
  AppMobileNav,
  AppSidebar,
} from "@/components/dashboard/app-shell";
import { isFeatureEnabled } from "@/lib/env";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabledFlags = {
    hitl_workspace: isFeatureEnabled("hitl_workspace"),
    inbox: isFeatureEnabled("inbox"),
    tribes: isFeatureEnabled("tribes"),
  };

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar enabledFlags={enabledFlags} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileNav enabledFlags={enabledFlags} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
