import Link from "next/link";

const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || "Grocery Store";

export default function SiteHeader({ active }: { active: "billing" | "admin" | "bulk" }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          {SHOP_NAME}
        </Link>
        <nav className="flex gap-1 text-sm">
          <Link
            href="/"
            className={`rounded-md px-3 py-1.5 font-medium ${
              active === "billing"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Billing
          </Link>
          <Link
            href="/bulk"
            className={`rounded-md px-3 py-1.5 font-medium ${
              active === "bulk"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Bulk
          </Link>
          <Link
            href="/admin"
            className={`rounded-md px-3 py-1.5 font-medium ${
              active === "admin"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
