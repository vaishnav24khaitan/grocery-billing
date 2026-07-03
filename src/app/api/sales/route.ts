import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Sale } from "@/models/Sale";
import { Staff } from "@/models/Staff";
import { getStaffIdFromSession } from "@/lib/staffAuth";
import type { BillLine } from "@/lib/types";

// POST /api/sales — record a completed sale (used by the billing screen).
// Requires a signed-in billing staff so the sale can be attributed.
export async function POST(request: Request) {
  const staffId = await getStaffIdFromSession();
  if (!staffId) {
    return NextResponse.json(
      { error: "Please sign in as billing staff to record a sale" },
      { status: 401 }
    );
  }

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

    const staff = await Staff.findById(staffId).lean<{
      _id: unknown;
      username: string;
      name: string;
      active: boolean;
    }>();
    if (!staff || !staff.active) {
      return NextResponse.json(
        { error: "Your billing session is no longer valid. Please sign in again." },
        { status: 401 }
      );
    }

    const sale = await Sale.create({
      items,
      total,
      staffId: staff._id,
      staffName: staff.name,
      staffUsername: staff.username,
    });
    return NextResponse.json({ ok: true, id: String(sale._id) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sales failed", err);
    return NextResponse.json(
      { error: "Failed to record sale" },
      { status: 500 }
    );
  }
}
