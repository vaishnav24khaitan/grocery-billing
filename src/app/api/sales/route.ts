import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Sale } from "@/models/Sale";
import type { BillLine } from "@/lib/types";

// POST /api/sales — record a completed sale (used by the billing screen).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as { items?: unknown; total?: unknown };
  if (!Array.isArray(b.items) || b.items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array" },
      { status: 400 }
    );
  }
  const total = Number(b.total);
  if (!Number.isFinite(total) || total < 0) {
    return NextResponse.json(
      { error: "total must be a number >= 0" },
      { status: 400 }
    );
  }

  const items = (b.items as BillLine[]).map((l) => ({
    name: String(l.name),
    unit: String(l.unit),
    unitPrice: Number(l.unitPrice),
    qty: Number(l.qty),
    lineTotal: Number(l.lineTotal),
  }));

  try {
    await connectToDatabase();
    const sale = await Sale.create({ items, total });
    return NextResponse.json({ ok: true, id: String(sale._id) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sales failed", err);
    return NextResponse.json(
      { error: "Failed to record sale" },
      { status: 500 }
    );
  }
}
