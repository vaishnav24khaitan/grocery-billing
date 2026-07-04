import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BulkCustomer } from "@/models/BulkCustomer";
import { BulkBill } from "@/models/BulkBill";
import { BulkPayment } from "@/models/BulkPayment";
import { requireActiveStaff } from "@/lib/staffRoute";

interface CustomerLean {
  _id: unknown;
  name: string;
  phone?: string;
  address?: string;
  createdAt?: Date;
}

// GET /api/bulk/customers — list bulk customers with their outstanding balance.
export async function GET() {
  const staff = await requireActiveStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Please sign in as billing staff" },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();
    const [customers, billAgg, payAgg] = await Promise.all([
      BulkCustomer.find({}).sort({ name: 1 }).lean<CustomerLean[]>(),
      BulkBill.aggregate([
        {
          $group: {
            _id: "$customerId",
            totalBilled: { $sum: "$total" },
            lastAt: { $max: "$createdAt" },
          },
        },
      ]),
      BulkPayment.aggregate([
        {
          $group: {
            _id: "$customerId",
            totalPaid: { $sum: "$amount" },
            lastAt: { $max: "$createdAt" },
          },
        },
      ]),
    ]);

    const billed = new Map<string, { total: number; lastAt?: Date }>();
    for (const b of billAgg)
      billed.set(String(b._id), { total: b.totalBilled, lastAt: b.lastAt });
    const paid = new Map<string, { total: number; lastAt?: Date }>();
    for (const p of payAgg)
      paid.set(String(p._id), { total: p.totalPaid, lastAt: p.lastAt });

    const out = customers.map((c) => {
      const id = String(c._id);
      const totalBilled = billed.get(id)?.total ?? 0;
      const totalPaid = paid.get(id)?.total ?? 0;
      const times = [billed.get(id)?.lastAt, paid.get(id)?.lastAt].filter(
        Boolean
      ) as Date[];
      const lastActivityAt =
        times.length > 0
          ? new Date(Math.max(...times.map((t) => t.getTime()))).toISOString()
          : undefined;
      return {
        _id: id,
        name: c.name,
        phone: c.phone ?? "",
        address: c.address ?? "",
        createdAt: c.createdAt ? c.createdAt.toISOString() : undefined,
        totalBilled: +totalBilled.toFixed(2),
        totalPaid: +totalPaid.toFixed(2),
        balance: +(totalBilled - totalPaid).toFixed(2),
        lastActivityAt,
      };
    });

    return NextResponse.json(out);
  } catch (err) {
    console.error("GET /api/bulk/customers failed", err);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}

// POST /api/bulk/customers — create a bulk customer.
export async function POST(request: Request) {
  const staff = await requireActiveStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Please sign in as billing staff" },
      { status: 401 }
    );
  }

  let body: { name?: unknown; phone?: unknown; address?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Customer name is required" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const created = await BulkCustomer.create({ name, phone, address });
    return NextResponse.json(
      {
        _id: String(created._id),
        name: created.name,
        phone: created.phone ?? "",
        address: created.address ?? "",
        createdAt: created.createdAt?.toISOString(),
        balance: 0,
        totalBilled: 0,
        totalPaid: 0,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/bulk/customers failed", err);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
