"use client";

import { useEffect, useState } from "react";
import { fetchBills } from "@/lib/api";
import {
  formatCurrency,
  type BillRecord,
  type BillsResponse,
  type SalesSource,
} from "@/lib/types";
import ReceiptView from "@/components/ReceiptView";

const PAGE_SIZE = 25;

export default function BillsList() {
  const [data, setData] = useState<BillsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [source, setSource] = useState<SalesSource>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<BillRecord | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchBills(source, page, PAGE_SIZE);
        if (active) setData(res);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load bills");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [source, page]);

  // Reset to page 1 whenever the source filter changes.
  function changeSource(s: SalesSource) {
    setSource(s);
    setPage(1);
  }

  if (selected) {
    return <ReceiptView bill={selected} onBack={() => setSelected(null)} />;
  }

  const SOURCES: { key: SalesSource; label: string }[] = [
    { key: "all", label: "All" },
    { key: "retail", label: "Retail" },
    { key: "bulk", label: "Bulk" },
  ];

  const bills = data?.bills ?? [];

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Source:</span>
        <div className="inline-flex rounded-md border border-gray-300 p-0.5">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              onClick={() => changeSource(s.key)}
              className={`rounded px-3 py-1 text-sm font-medium ${
                source === s.key
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {data && (
          <span className="text-xs text-gray-400">
            {data.total} {data.total === 1 ? "bill" : "bills"}
          </span>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading bills…</p>
      ) : bills.length === 0 ? (
        <p className="text-sm text-gray-500">No bills yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Bill No</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Customer / Staff</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bills.map((b) => (
                  <tr key={`${b.source}-${b.id}`} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                      {new Date(b.date).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">
                      {b.billNo}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          b.source === "bulk"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {b.source === "bulk" ? "Bulk" : "Retail"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {b.source === "bulk" ? (
                        <span className="font-medium">
                          {b.customerName || "—"}
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          {b.staffName || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {b.items.length}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                      {formatCurrency(b.total)}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setSelected(b)}
                        className="text-emerald-700 hover:underline"
                      >
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Page {data.page} of {data.pageCount}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(data.pageCount, p + 1))
                  }
                  disabled={data.page >= data.pageCount}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
