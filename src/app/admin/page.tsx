import SiteHeader from "@/components/SiteHeader";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  return (
    <>
      <SiteHeader active="admin" />
      <main className="flex-1">
        {authed ? <AdminDashboard /> : <AdminLogin />}
      </main>
    </>
  );
}
