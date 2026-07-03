"use client";

import { useEffect, useState } from "react";
import { fetchSalesSummary } from "@/lib/api";
import { formatCurrency, type SalesSummary, type SalesBucket, type StaffTotals } from "@/lib/types";

export default function SalesReport() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const [staffView, setStaffView] = useState<"today" | "month">("today");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSalesSummary();
        if (active) setSummary(data);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load sales");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading sales…</p>;
  if (error)
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  if (!summary) return null;

  const rows = view === "daily" ? [...summary.daily].reverse() : [...summary.monthly].reverse();
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  const staffRows: StaffTotals[] =
    (staffView === "today" ? summary.byStaffToday : summary.byStaffMonth) ?? [];

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Today's sales" bucket={summary.today} />
        <StatCard label="This month's sales" bucket={summary.thisMonth} />
      </div>

      {/* Toggle */}
      <div className="mb-3 inline-flex rounded-md border border-gray-300 p-0.5">
        <button
          onClick={() => setView("daily")}
          className={`rounded px-3 py-1 text-sm font-medium ${
            view === "daily"
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Daily (30d)
        </button>
        <button
          onClick={() => setView("monthly")}
          className={`rounded px-3 py-1 text-sm font-medium ${
            view === "monthly"
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Monthly (12m)
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No sales recorded in this period yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">
                  {view === "daily" ? "Date" : "Month"}
                </th>
                <th className="px-4 py-2 font-medium">Bills</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {r.key}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{r.count}</td>
                  <td className="px-4 py-2 font-semibold text-emerald-700">
                    {formatCurrency(r.total)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="h-2 w-full rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-emerald-500"
                        style={{ width: `${(r.total / maxTotal) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-staff breakdown */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Sales by staff</h3>
          <div className="inline-flex rounded-md border border-gray-300 p-0.5">
            <button
              onClick={() => setStaffView("today")}
              className={`rounded px-3 py-1 text-sm font-medium ${
                staffView === "today"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setStaffView("month")}
              className={`rounded px-3 py-1 text-sm font-medium ${
                staffView === "month"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              This month
            </button>
          </div>
        </div>

        {staffRows.length === 0 ? (
          <p className="text-sm text-gray-500">
            No sales recorded by staff in this period yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Staff</th>
                  <th className="px-4 py-2 font-medium">Bills</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffRows.map((s, i) => (
                  <tr key={`${s.staffUsername}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {s.staffName}
                      {s.staffUsername && (
                        <span className="ml-1 text-xs text-gray-400">
                          @{s.staffUsername}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{s.count}</td>
                    <td className="px-4 py-2 font-semibold text-emerald-700">
                      {formatCurrency(s.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, bucket }: { label: string; bucket: SalesBucket }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-emerald-700">
        {formatCurrency(bucket.total)}
      </p>
      <p className="text-xs text-gray-500">
        {bucket.count} {bucket.count === 1 ? "bill" : "bills"}
      </p>
    </div>
  );
}
