import { NextResponse } from "next/server";
import type { Model } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Sale } from "@/models/Sale";
import { BulkBill } from "@/models/BulkBill";
import { isAdminAuthenticated } from "@/lib/auth";

const TZ = "Asia/Kolkata";

interface Bucket {
  key: string;
  total: number;
  count: number;
}

interface StaffTotals {
  staffName: string;
  staffUsername: string;
  total: number;
  count: number;
}

interface Summary {
  today: Bucket;
  thisMonth: Bucket;
  daily: Bucket[];
  monthly: Bucket[];
  byStaffToday: StaffTotals[];
  byStaffMonth: StaffTotals[];
}

interface StaffAgg {
  _id: { name?: string | null; username?: string | null };
  total: number;
  count: number;
}

interface Ctx {
  thirtyDaysAgo: Date;
  twelveMonthsAgo: Date;
  startOfToday: Date;
  startOfMonth: Date;
  todayKey: string;
  monthKey: string;
}

function mapStaff(raw: StaffAgg[]): StaffTotals[] {
  return raw.map((r) => ({
    staffName: r._id.name || "Unknown",
    staffUsername: r._id.username || "",
    total: r.total,
    count: r.count,
  }));
}

// Build the full report for a single collection (retail Sale or BulkBill).
async function summarizeModel(
  model: Model<unknown>,
  ctx: Ctx
): Promise<Summary> {
  const staffGroup = {
    $group: {
      _id: { name: "$staffName", username: "$staffUsername" },
      total: { $sum: "$total" },
      count: { $sum: 1 },
    },
  };

  const [dailyRaw, monthlyRaw, byStaffTodayRaw, byStaffMonthRaw] =
    await Promise.all([
      model.aggregate([
        { $match: { createdAt: { $gte: ctx.thirtyDaysAgo } } },
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
      model.aggregate([
        { $match: { createdAt: { $gte: ctx.twelveMonthsAgo } } },
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
      model.aggregate([
        { $match: { createdAt: { $gte: ctx.startOfToday } } },
        staffGroup,
        { $sort: { total: -1 } },
      ]),
      model.aggregate([
        { $match: { createdAt: { $gte: ctx.startOfMonth } } },
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

  const today = daily.find((d) => d.key === ctx.todayKey) ?? {
    key: ctx.todayKey,
    total: 0,
    count: 0,
  };
  const thisMonth = monthly.find((m) => m.key === ctx.monthKey) ?? {
    key: ctx.monthKey,
    total: 0,
    count: 0,
  };

  return {
    today,
    thisMonth,
    daily,
    monthly,
    byStaffToday: mapStaff(byStaffTodayRaw as StaffAgg[]),
    byStaffMonth: mapStaff(byStaffMonthRaw as StaffAgg[]),
  };
}

function mergeBuckets(a: Bucket[], b: Bucket[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const arr of [a, b]) {
    for (const x of arr) {
      const cur = map.get(x.key);
      if (cur) {
        cur.total = +(cur.total + x.total).toFixed(2);
        cur.count += x.count;
      } else {
        map.set(x.key, { key: x.key, total: x.total, count: x.count });
      }
    }
  }
  return [...map.values()].sort((x, y) => x.key.localeCompare(y.key));
}

function mergeStaff(a: StaffTotals[], b: StaffTotals[]): StaffTotals[] {
  const map = new Map<string, StaffTotals>();
  for (const arr of [a, b]) {
    for (const s of arr) {
      const k = s.staffUsername || s.staffName;
      const cur = map.get(k);
      if (cur) {
        cur.total = +(cur.total + s.total).toFixed(2);
        cur.count += s.count;
      } else {
        map.set(k, { ...s });
      }
    }
  }
  return [...map.values()].sort((x, y) => y.total - x.total);
}

function mergeSummaries(a: Summary, b: Summary, ctx: Ctx): Summary {
  const daily = mergeBuckets(a.daily, b.daily);
  const monthly = mergeBuckets(a.monthly, b.monthly);
  return {
    today: daily.find((d) => d.key === ctx.todayKey) ?? {
      key: ctx.todayKey,
      total: 0,
      count: 0,
    },
    thisMonth: monthly.find((m) => m.key === ctx.monthKey) ?? {
      key: ctx.monthKey,
      total: 0,
      count: 0,
    },
    daily,
    monthly,
    byStaffToday: mergeStaff(a.byStaffToday, b.byStaffToday),
    byStaffMonth: mergeStaff(a.byStaffMonth, b.byStaffMonth),
  };
}

// GET /api/sales/summary — admin-only report split by source (retail / bulk / all).
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

    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const monthKey = todayKey.slice(0, 7);

    const startOfToday = new Date(`${todayKey}T00:00:00+05:30`);
    const startOfMonth = new Date(`${monthKey}-01T00:00:00+05:30`);

    const ctx: Ctx = {
      thirtyDaysAgo,
      twelveMonthsAgo,
      startOfToday,
      startOfMonth,
      todayKey,
      monthKey,
    };

    const [retail, bulk] = await Promise.all([
      summarizeModel(Sale as unknown as Model<unknown>, ctx),
      summarizeModel(BulkBill as unknown as Model<unknown>, ctx),
    ]);
    const all = mergeSummaries(retail, bulk, ctx);

    // `all` is also spread at the top level for backward compatibility with any
    // caller that expects the flat summary shape.
    return NextResponse.json({ ...all, retail, bulk, all });
  } catch (err) {
    console.error("GET /api/sales/summary failed", err);
    return NextResponse.json(
      { error: "Failed to load sales summary" },
      { status: 500 }
    );
  }
}
