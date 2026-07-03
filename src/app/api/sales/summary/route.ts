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

interface StaffAgg {
  _id: { name?: string | null; username?: string | null };
  total: number;
  count: number;
}

function mapStaff(raw: StaffAgg[]) {
  return raw.map((r) => ({
    staffName: r._id.name || "Unknown",
    staffUsername: r._id.username || "",
    total: r.total,
    count: r.count,
  }));
}

// GET /api/sales/summary — admin-only sales report (daily + monthly + per-staff).
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

    // Current day / month keys in IST.
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const monthKey = todayKey.slice(0, 7);

    // IST day/month boundaries expressed as absolute instants (IST = UTC+5:30).
    const startOfToday = new Date(`${todayKey}T00:00:00+05:30`);
    const startOfMonth = new Date(`${monthKey}-01T00:00:00+05:30`);

    const staffGroup = {
      $group: {
        _id: { name: "$staffName", username: "$staffUsername" },
        total: { $sum: "$total" },
        count: { $sum: 1 },
      },
    };

    const [dailyRaw, monthlyRaw, byStaffTodayRaw, byStaffMonthRaw] =
      await Promise.all([
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
        Sale.aggregate([
          { $match: { createdAt: { $gte: startOfToday } } },
          staffGroup,
          { $sort: { total: -1 } },
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: startOfMonth } } },
          staffGroup,
          { $sort: { total: -1 } },
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

    return NextResponse.json({
      today,
      thisMonth,
      daily,
      monthly,
      byStaffToday: mapStaff(byStaffTodayRaw as StaffAgg[]),
      byStaffMonth: mapStaff(byStaffMonthRaw as StaffAgg[]),
    });
  } catch (err) {
    console.error("GET /api/sales/summary failed", err);
    return NextResponse.json(
      { error: "Failed to load sales summary" },
      { status: 500 }
    );
  }
}
