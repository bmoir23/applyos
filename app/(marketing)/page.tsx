import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function MarketingHomePage() {
  return (
    <section className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-20 md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_oklch(0.97_0.01_250)_0%,_transparent_55%),linear-gradient(to_bottom,_oklch(0.99_0.005_90),_oklch(0.96_0.01_220))]"
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Career navigator
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            ApplyOS
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            Discover roles, score resume fit, draft tailored documents, and
            track applications — with AI assistance that never acts without
            your approval.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <Button size="lg">Start free</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Button render={<Link href="/dashboard" />} size="lg">
              Go to dashboard
            </Button>
          </Show>
          <Button
            render={<Link href="/sign-in" />}
            variant="outline"
            size="lg"
          >
            Sign in
          </Button>
        </div>
        <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <li>Crawl career pages you choose</li>
          <li>Score fit without inventing experience</li>
          <li>Track applications manually first</li>
        </ul>
      </div>
    </section>
  );
}
