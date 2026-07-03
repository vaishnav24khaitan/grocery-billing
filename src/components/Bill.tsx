"use client";

import { useMemo, useRef, useState } from "react";
import { formatCurrency, type BillLine } from "@/lib/types";

const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || "Grocery Store";

interface BillProps {
  lines: BillLine[];
  total: number;
  onBack: () => void;
  onNewSale: () => void;
}

export default function Bill({ lines, total, onBack, onNewSale }: BillProps) {
  const billRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const meta = useMemo(() => {
    const now = new Date();
    const billNo = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;
    return {
      billNo,
      dateStr: now.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    };
  }, []);

  async function renderCanvas(): Promise<HTMLCanvasElement> {
    const { default: html2canvas } = await import("html2canvas-pro");
    const node = billRef.current!;
    return html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
  }

  async function downloadImage() {
    setNote("");
    setBusy("image");
    try {
      const canvas = await renderCanvas();
      const link = document.createElement("a");
      link.download = `${meta.billNo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setNote("Could not generate image.");
    } finally {
      setBusy(null);
    }
  }

  async function buildPdfBlob(): Promise<Blob> {
    const canvas = await renderCanvas();
    const { jsPDF } = await import("jspdf");
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 24;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;
    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
    return pdf.output("blob");
  }

  async function downloadPdf() {
    setNote("");
    setBusy("pdf");
    try {
      const blob = await buildPdfBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${meta.billNo}.pdf`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setNote("Could not generate PDF.");
    } finally {
      setBusy(null);
    }
  }

  // Share the bill image via the native share sheet (WhatsApp, etc.).
  async function shareBill() {
    setNote("");
    setBusy("share");
    try {
      const canvas = await renderCanvas();
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("no blob");

      const file = new File([blob], `${meta.billNo}.png`, {
        type: "image/png",
      });
      const shareData: ShareData = {
        title: `${SHOP_NAME} bill`,
        text: `${SHOP_NAME} — Bill ${meta.billNo}\nTotal: ${formatCurrency(
          total
        )}`,
        files: [file],
      };

      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };

      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share(shareData);
      } else if (nav.share) {
        // No file support — share text summary only.
        await nav.share({ title: shareData.title, text: shareData.text });
      } else {
        setNote(
          "Sharing isn't supported on this browser. Use Download image instead."
        );
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          ← Back to cart
        </button>
        <div className="flex-1" />
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
        ref={billRef}
        className="rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm"
      >
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-emerald-700">{SHOP_NAME}</h1>
          <p className="text-xs text-gray-500">Tax Invoice</p>
        </div>
        <div className="mb-4 flex justify-between text-xs text-gray-600">
          <span>Bill No: {meta.billNo}</span>
          <span>{meta.dateStr}</span>
        </div>

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
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1.5">{l.name}</td>
                <td className="py-1.5 text-center">
                  {l.qty} {l.unit}
                </td>
                <td className="py-1.5 text-right">
                  {formatCurrency(l.unitPrice)}
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
                Grand Total
              </td>
              <td className="pt-3 text-right text-lg font-bold text-emerald-700">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-center text-xs text-gray-500">
          Thank you for shopping with us!
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onNewSale}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Start new sale
        </button>
      </div>
    </div>
  );
}
