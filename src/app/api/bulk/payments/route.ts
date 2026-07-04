import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BulkCustomer } from "@/models/BulkCustomer";
import { BulkPayment } from "@/models/BulkPayment";
import { requireActiveStaff } from "@/lib/staffRoute";

// POST /api/bulk/payments — record a deposit / repayment from a customer.
export async function POST(request: Request) {
  const staff = await requireActiveStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Please sign in as billing staff" },
      { status: 401 }
    );
  }

  let body: { customerId?: unknown; amount?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const customerId =
    typeof body.customerId === "string" ? body.customerId : "";
  const amount = Number(body.amount);
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!customerId) {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than 0" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const customer = await BulkCustomer.findById(customerId).lean<{
      _id: unknown;
    }>();
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const payment = await BulkPayment.create({
      customerId,
      amount: +amount.toFixed(2),
      note,
      staffId: staff._id,
      staffName: staff.name,
      staffUsername: staff.username,
    });

    return NextResponse.json(
      { ok: true, id: String(payment._id) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/bulk/payments failed", err);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
