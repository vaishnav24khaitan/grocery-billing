import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Sale } from "@/models/Sale";
import { BulkBill } from "@/models/BulkBill";
import { isAdminAuthenticated } from "@/lib/auth";
import type { BillRecord, BillRecordItem } from "@/lib/types";

// Cap how many recent bills of each type we scan/merge (a small store won't
// come close, but this keeps the merge bounded).
const SCAN_LIMIT = 2000;

interface SaleDoc {
  _id: unknown;
  items?: {
    name?: string;
    unit?: string;
    unitPrice?: number;
    qty?: number;
    lineTotal?: number;
  }[];
  total?: number;
  staffName?: string;
  staffUsername?: string;
  createdAt?: Date;
}

interface BulkDoc {
  _id: unknown;
  billNo?: string;
  customerName?: string;
  items?: {
    name?: string;
    unit?: string;
    price?: number;
    mrp?: number;
    qty?: number;
    lineTotal?: number;
  }[];
  total?: number;
  paidNow?: number;
  staffName?: string;
  staffUsername?: string;
  createdAt?: Date;
}

function retailBillNo(date: Date, id: string): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `INV-${date.getFullYear()}${p(date.getMonth() + 1)}${p(
    date.getDate()
  )}-${id.slice(-6).toUpperCase()}`;
}

// GET /api/sales/bills?source=all|retail|bulk&page=1&pageSize=25
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const source = (searchParams.get("source") || "all") as
    | "all"
    | "retail"
    | "bulk";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize")) || 25)
  );

  try {
    await connectToDatabase();

    const records: BillRecord[] = [];

    if (source === "all" || source === "retail") {
      const sales = await Sale.find({})
        .sort({ createdAt: -1 })
        .limit(SCAN_LIMIT)
        .lean<SaleDoc[]>();
      for (const s of sales) {
        const id = String(s._id);
        const date = s.createdAt ? new Date(s.createdAt) : new Date(0);
        const items: BillRecordItem[] = (s.items ?? []).map((l) => ({
          name: String(l.name ?? ""),
          unit: String(l.unit ?? ""),
          qty: Number(l.qty ?? 0),
          rate: Number(l.unitPrice ?? 0),
          lineTotal: Number(l.lineTotal ?? 0),
        }));
        records.push({
          id,
          source: "retail",
          billNo: retailBillNo(date, id),
          date: date.toISOString(),
          total: Number(s.total ?? 0),
          items,
          staffName: s.staffName,
          staffUsername: s.staffUsername,
        });
      }
    }

    if (source === "all" || source === "bulk") {
      const bulk = await BulkBill.find({})
        .sort({ createdAt: -1 })
        .limit(SCAN_LIMIT)
        .lean<BulkDoc[]>();
      for (const b of bulk) {
        const id = String(b._id);
        const date = b.createdAt ? new Date(b.createdAt) : new Date(0);
        const items: BillRecordItem[] = (b.items ?? []).map((l) => ({
          name: String(l.name ?? ""),
          unit: String(l.unit ?? ""),
          qty: Number(l.qty ?? 0),
          rate: Number(l.price ?? 0),
          mrp: typeof l.mrp === "number" ? l.mrp : undefined,
          lineTotal: Number(l.lineTotal ?? 0),
        }));
        records.push({
          id,
          source: "bulk",
          billNo: b.billNo || `BLK-${id.slice(-6).toUpperCase()}`,
          date: date.toISOString(),
          total: Number(b.total ?? 0),
          items,
          staffName: b.staffName,
          staffUsername: b.staffUsername,
          customerName: b.customerName,
          paidNow: Number(b.paidNow ?? 0),
        });
      }
    }

    records.sort((a, b) => b.date.localeCompare(a.date));

    const total = records.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const bills = records.slice(start, start + pageSize);

    return NextResponse.json({ bills, total, page, pageSize, pageCount });
  } catch (err) {
    console.error("GET /api/sales/bills failed", err);
    return NextResponse.json(
      { error: "Failed to load bills" },
      { status: 500 }
    );
  }
}
