import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

export default function TdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col pt-[84px]">{children}</div>
      <Footer />
    </div>
  );
}