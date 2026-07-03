import SiteHeader from "@/components/SiteHeader";
import BillingApp from "@/components/BillingApp";

export default function Home() {
  return (
    <>
      <SiteHeader active="billing" />
      <main className="flex-1">
        <BillingApp />
      </main>
    </>
  );
}
