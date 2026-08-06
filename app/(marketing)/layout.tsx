import { MarketingHeader } from "@/components/dashboard/marketing-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MarketingHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
