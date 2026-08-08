import SiteHeader from "@/components/SiteHeader";

export default function TdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col pt-[79px]">{children}</div>
    </div>
  );
}