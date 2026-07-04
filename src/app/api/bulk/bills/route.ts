import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BulkCustomer } from "@/models/BulkCustomer";
import { BulkBill } from "@/models/BulkBill";
import { BulkPayment } from "@/models/BulkPayment";
import { requireActiveStaff } from "@/lib/staffRoute";
import { PRODUCT_UNITS } from "@/lib/types";

type IncomingLine = {
  name?: unknown;
  unit?: unknown;
  qty?: unknown;
  price?: unknown;
  mrp?: unknown;
};

// POST /api/bulk/bills — create a bulk bill for a customer.
// If paidNow > 0, a matching BulkPayment is recorded so the balance stays correct.
export async function POST(request: Request) {
  const staff = await requireActiveStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Please sign in as billing staff" },
      { status: 401 }
    );
  }

  let body: { customerId?: unknown; items?: unknown; paidNow?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const customerId =
    typeof body.customerId === "string" ? body.customerId : "";
  if (!customerId) {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  const items = (body.items as IncomingLine[]).map((l) => {
    const name = String(l.name ?? "").trim();
    let unit = String(l.unit ?? "kg");
    if (!PRODUCT_UNITS.includes(unit as (typeof PRODUCT_UNITS)[number])) {
      unit = "kg";
    }
    const qty = Number(l.qty);
    const price = Number(l.price);
    const mrp =
      l.mrp === "" || l.mrp === null || l.mrp === undefined
        ? undefined
        : Number(l.mrp);
    const lineTotal = +(qty * price).toFixed(2);
    return { name, unit, qty, price, mrp, lineTotal };
  });

  for (const it of items) {
    if (!it.name) {
      return NextResponse.json(
        { error: "Every line needs a name" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(it.qty) || it.qty <= 0) {
      return NextResponse.json(
        { error: `Quantity must be greater than 0 for "${it.name}"` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(it.price) || it.price < 0) {
      return NextResponse.json(
        { error: `Price must be 0 or more for "${it.name}"` },
        { status: 400 }
      );
    }
  }

  const total = +items.reduce((s, it) => s + it.lineTotal, 0).toFixed(2);
  let paidNow = Number(body.paidNow);
  if (!Number.isFinite(paidNow) || paidNow < 0) paidNow = 0;

  try {
    await connectToDatabase();
    const customer = await BulkCustomer.findById(customerId).lean<{
      _id: unknown;
      name: string;
    }>();
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const billNo = `BLK-${Date.now().toString(36).toUpperCase()}`;
    const bill = await BulkBill.create({
      customerId,
      customerName: customer.name,
      billNo,
      items,
      total,
      paidNow,
      staffId: staff._id,
      staffName: staff.name,
      staffUsername: staff.username,
    });

    if (paidNow > 0) {
      await BulkPayment.create({
        customerId,
        amount: paidNow,
        note: `Paid at billing (${billNo})`,
        billId: bill._id,
        staffId: staff._id,
        staffName: staff.name,
        staffUsername: staff.username,
      });
    }

    return NextResponse.json(
      { ok: true, id: String(bill._id), billNo, total, paidNow },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/bulk/bills failed", err);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}
