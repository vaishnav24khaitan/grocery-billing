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

// GET /api/bulk/customers/[id] — full ledger (bills + payments + balance).
export async function GET(
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
    const customer = await BulkCustomer.findById(id).lean<CustomerLean>();
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const [bills, payments] = await Promise.all([
      BulkBill.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
      BulkPayment.find({ customerId: id }).sort({ createdAt: -1 }).lean(),
    ]);

    const billsOut = bills.map((b: Record<string, unknown>) => ({
      _id: String(b._id),
      customerId: String(b.customerId),
      customerName: b.customerName as string,
      billNo: b.billNo as string,
      items: (b.items as unknown[]) ?? [],
      total: b.total as number,
      paidNow: (b.paidNow as number) ?? 0,
      staffName: b.staffName as string | undefined,
      createdAt: (b.createdAt as Date | undefined)?.toISOString(),
    }));

    const paymentsOut = payments.map((p: Record<string, unknown>) => ({
      _id: String(p._id),
      customerId: String(p.customerId),
      amount: p.amount as number,
      note: (p.note as string) ?? "",
      staffName: p.staffName as string | undefined,
      createdAt: (p.createdAt as Date | undefined)?.toISOString(),
    }));

    const totalBilled = +billsOut
      .reduce((s, b) => s + b.total, 0)
      .toFixed(2);
    const totalPaid = +paymentsOut
      .reduce((s, p) => s + p.amount, 0)
      .toFixed(2);

    return NextResponse.json({
      customer: {
        _id: String(customer._id),
        name: customer.name,
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        createdAt: customer.createdAt?.toISOString(),
        totalBilled,
        totalPaid,
        balance: +(totalBilled - totalPaid).toFixed(2),
      },
      bills: billsOut,
      payments: paymentsOut,
      totalBilled,
      totalPaid,
      balance: +(totalBilled - totalPaid).toFixed(2),
    });
  } catch (err) {
    console.error("GET /api/bulk/customers/[id] failed", err);
    return NextResponse.json(
      { error: "Failed to load ledger" },
      { status: 500 }
    );
  }
}
