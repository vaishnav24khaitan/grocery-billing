import SiteHeader from "@/components/SiteHeader";
import BulkBillingApp from "@/components/BulkBillingApp";

export default function BulkPage() {
  return (
    <>
      <SiteHeader active="bulk" />
      <main className="flex-1">
        <BulkBillingApp />
      </main>
    </>
  );
}
