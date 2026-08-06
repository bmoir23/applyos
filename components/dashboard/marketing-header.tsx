import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="flex h-16 items-center justify-between px-6 md:px-10">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        ApplyOS
      </Link>
      <div className="flex items-center gap-2">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm">Get started</Button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Button render={<Link href="/dashboard" />} size="sm">
            Open dashboard
          </Button>
        </Show>
      </div>
    </header>
  );
}
