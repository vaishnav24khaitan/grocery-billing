"use client";

import { useRef, useState } from "react";
import { formatCurrency, type BulkLine } from "@/lib/types";

const SHOP_NAME = "Kirana Store";

interface BulkBillProps {
  billNo: string;
  dateStr: string;
  customerName: string;
  items: BulkLine[];
  total: number;
  paidNow: number;
  prevBalance: number;
  newBalance: number;
  // A payment-only receipt (no line items).
  paymentOnly?: boolean;
  onNewBill: () => void;
}

export default function BulkBill({
  billNo,
  dateStr,
  customerName,
  items,
  total,
  paidNow,
  prevBalance,
  newBalance,
  paymentOnly = false,
  onNewBill,
}: BulkBillProps) {
  const billRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const title = paymentOnly ? "Payment Receipt" : "Bill / Invoice";

  async function renderCanvas(): Promise<HTMLCanvasElement> {
    const { default: html2canvas } = await import("html2canvas-pro");
    return html2canvas(billRef.current!, { scale: 2, backgroundColor: "#ffffff" });
  }

  async function downloadImage() {
    setNote("");
    setBusy("image");
    try {
      const canvas = await renderCanvas();
      const link = document.createElement("a");
      link.download = `${billNo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setNote("Could not generate image.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setNote("");
    setBusy("pdf");
    try {
      const canvas = await renderCanvas();
      const { jsPDF } = await import("jspdf");
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 24;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${billNo}.pdf`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setNote("Could not generate PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function shareBill() {
    setNote("");
    setBusy("share");
    try {
      const canvas = await renderCanvas();
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("no blob");
      const file = new File([blob], `${billNo}.png`, { type: "image/png" });
      const text = `${SHOP_NAME} — ${title} ${billNo}\n${customerName}\nBalance: ${formatCurrency(
        newBalance
      )}`;
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ title: `${SHOP_NAME} ${title}`, text, files: [file] });
      } else if (nav.share) {
        await nav.share({ title: `${SHOP_NAME} ${title}`, text });
      } else {
        setNote("Sharing isn't supported on this browser. Use Download image instead.");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setNote("Sharing was cancelled or failed.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onNewBill}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          ← New bill
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          disabled={busy !== null}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Print
        </button>
        <button
          onClick={downloadImage}
          disabled={busy !== null}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {busy === "image" ? "Working…" : "Download image"}
        </button>
        <button
          onClick={downloadPdf}
          disabled={busy !== null}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {busy === "pdf" ? "Working…" : "Download PDF"}
        </button>
        <button
          onClick={shareBill}
          disabled={busy !== null}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === "share" ? "Working…" : "Share"}
        </button>
      </div>

      {note && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {note}
        </p>
      )}

      {/* Printable bill */}
      <div
        id="printable-bill"
        ref={billRef}
        className="rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm"
      >
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-emerald-700">{SHOP_NAME}</h1>
          <p className="text-xs text-gray-500">{title}</p>
        </div>
        <div className="mb-4 flex justify-between text-xs text-gray-600">
          <span>Bill No: {billNo}</span>
          <span>{dateStr}</span>
        </div>
        <p className="mb-4 text-sm">
          <span className="text-gray-500">Customer: </span>
          <span className="font-semibold">{customerName}</span>
        </p>

        {!paymentOnly && items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-gray-600">
                <th className="py-1.5">Item</th>
                <th className="py-1.5 text-center">Qty</th>
                <th className="py-1.5 text-right">Rate</th>
                <th className="py-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5">
                    {l.name}
                    {l.mrp && l.mrp > l.price ? (
                      <span className="ml-1 text-xs text-gray-400 line-through">
                        {formatCurrency(l.mrp)}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1.5 text-center">
                    {l.qty} {l.unit}
                  </td>
                  <td className="py-1.5 text-right">
                    {formatCurrency(l.price)}
                  </td>
                  <td className="py-1.5 text-right">
                    {formatCurrency(l.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-3 text-right font-semibold">
                  Bill Total
                </td>
                <td className="pt-3 text-right text-lg font-bold text-emerald-700">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Account summary */}
        <div className="mt-6 space-y-1 border-t border-gray-200 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Previous balance</span>
            <span>{formatCurrency(prevBalance)}</span>
          </div>
          {!paymentOnly && (
            <div className="flex justify-between text-gray-600">
              <span>+ This bill</span>
              <span>{formatCurrency(total)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>− Amount received</span>
            <span>{formatCurrency(paidNow)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold">
            <span>Remaining balance</span>
            <span className={newBalance > 0 ? "text-red-600" : "text-emerald-700"}>
              {formatCurrency(newBalance)}
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Thank you for your business!
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onNewBill}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          New bill
        </button>
      </div>
    </div>
  );
}
