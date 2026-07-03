import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Sale } from "@/models/Sale";
import { isAdminAuthenticated } from "@/lib/auth";

const TZ = "Asia/Kolkata";

interface Bucket {
  key: string;
  total: number;
  count: number;
}

// GET /api/sales/summary — admin-only sales report (daily + monthly).
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const [dailyRaw, monthlyRaw] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: TZ,
              },
            },
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m",
                date: "$createdAt",
                timezone: TZ,
              },
            },
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const daily: Bucket[] = dailyRaw.map((d) => ({
      key: d._id,
      total: d.total,
      count: d.count,
    }));
    const monthly: Bucket[] = monthlyRaw.map((m) => ({
      key: m._id,
      total: m.total,
      count: m.count,
    }));

    // Current day / month keys in IST.
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const monthKey = todayKey.slice(0, 7);

    const today = daily.find((d) => d.key === todayKey) ?? {
      key: todayKey,
      total: 0,
      count: 0,
    };
    const thisMonth = monthly.find((m) => m.key === monthKey) ?? {
      key: monthKey,
      total: 0,
      count: 0,
    };

    return NextResponse.json({ today, thisMonth, daily, monthly });
  } catch (err) {
    console.error("GET /api/sales/summary failed", err);
    return NextResponse.json(
      { error: "Failed to load sales summary" },
      { status: 500 }
    );
  }
}
