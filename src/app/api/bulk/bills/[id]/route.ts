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

function normalizeItems(raw: IncomingLine[]) {
  return raw.map((l) => {
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
}

// PUT /api/bulk/bills/[id] — edit a saved bulk bill (items and/or amount paid).
// The "paid at billing" payment linked to this bill is kept in sync.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireActiveStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Please sign in as billing staff" },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body: {
    items?: unknown;
    paidNow?: unknown;
    customerId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  const items = normalizeItems(body.items as IncomingLine[]);
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
    const bill = await BulkBill.findById(id);
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Optional re-assignment to a different customer.
    if (
      typeof body.customerId === "string" &&
      body.customerId &&
      body.customerId !== String(bill.customerId)
    ) {
      const customer = await BulkCustomer.findById(body.customerId).lean<{
        _id: unknown;
        name: string;
      }>();
      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
      bill.customerId = customer._id;
      bill.customerName = customer.name;
    }

    bill.items = items;
    bill.total = total;
    bill.paidNow = paidNow;
    await bill.save();

    // Keep the "paid at billing" payment in sync with the new paidNow.
    const linked = await BulkPayment.findOne({ billId: bill._id });
    if (paidNow > 0) {
      if (linked) {
        linked.amount = paidNow;
        linked.customerId = bill.customerId;
        linked.note = `Paid at billing (${bill.billNo})`;
        await linked.save();
      } else {
        await BulkPayment.create({
          customerId: bill.customerId,
          amount: paidNow,
          note: `Paid at billing (${bill.billNo})`,
          billId: bill._id,
          staffId: staff._id,
          staffName: staff.name,
          staffUsername: staff.username,
        });
      }
    } else if (linked) {
      await linked.deleteOne();
    }

    return NextResponse.json({
      ok: true,
      id: String(bill._id),
      billNo: bill.billNo,
      total,
      paidNow,
    });
  } catch (err) {
    console.error("PUT /api/bulk/bills/[id] failed", err);
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    );
  }
}

// DELETE /api/bulk/bills/[id] — remove a bill and its linked billing payment.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireActiveStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Please sign in as billing staff" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    await connectToDatabase();
    const bill = await BulkBill.findById(id);
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }
    await BulkPayment.deleteMany({ billId: bill._id });
    await bill.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/bulk/bills/[id] failed", err);
    return NextResponse.json(
      { error: "Failed to delete bill" },
      { status: 500 }
    );
  }
}
