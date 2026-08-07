"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Inbox,
  LayoutDashboard,
  Menu,
  Settings,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/applications", label: "Applications", icon: Send },
  {
    href: "/approvals",
    label: "Approvals",
    icon: CheckCircle2,
    flag: "hitl_workspace" as const,
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: Inbox,
    flag: "inbox" as const,
  },
  {
    href: "/tribes",
    label: "Tribes",
    icon: Users,
    flag: "tribes" as const,
  },
  {
    href: "/career",
    label: "Career",
    icon: TrendingUp,
    flag: "tribes" as const,
  },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

type EnabledFlags = {
  hitl_workspace: boolean;
  inbox: boolean;
  tribes: boolean;
};

function NavLinks({
  onNavigate,
  enabledFlags,
}: {
  onNavigate?: () => void;
  enabledFlags: EnabledFlags;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const { href, label, icon: Icon } = item;
        const flag = "flag" in item ? item.flag : null;
        if (flag && !enabledFlags[flag]) {
          return null;
        }

        const active =
          pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function PostHogIdentity() {
  const { isLoaded, isSignedIn, user } = useUser();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      if (previousUserId.current) {
        posthog.reset();
        previousUserId.current = null;
      }
      return;
    }

    if (previousUserId.current && previousUserId.current !== user.id) {
      posthog.reset();
    }

    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      first_name: user.firstName,
      last_name: user.lastName,
    });
    previousUserId.current = user.id;
  }, [isLoaded, isSignedIn, user]);

  return null;
}

export function AppSidebar({ enabledFlags }: { enabledFlags: EnabledFlags }) {
  return (
    <>
      <PostHogIdentity />
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight">
            ApplyOS
          </Link>
        </div>
        <Separator />
        <div className="flex flex-1 flex-col gap-4 p-3">
          <NavLinks enabledFlags={enabledFlags} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 px-1">
            <UserButton userProfileMode="modal" />
            <span className="text-xs text-muted-foreground">Account</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export function AppMobileNav({ enabledFlags }: { enabledFlags: EnabledFlags }) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
      <Link href="/dashboard" className="font-semibold tracking-tight">
        ApplyOS
      </Link>
      <div className="flex items-center gap-2">
        <UserButton userProfileMode="modal" />
        <Sheet>
          <SheetTrigger
            render={<Button variant="outline" size="icon-sm" />}
          >
            <Menu />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle>ApplyOS</SheetTitle>
            </SheetHeader>
            <div className="p-3">
              <NavLinks enabledFlags={enabledFlags} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
