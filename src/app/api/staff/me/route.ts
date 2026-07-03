import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Staff } from "@/models/Staff";
import { getStaffIdFromSession } from "@/lib/staffAuth";

// GET /api/staff/me — returns the currently signed-in billing staff, or null.
export async function GET() {
  const staffId = await getStaffIdFromSession();
  if (!staffId) {
    return NextResponse.json({ staff: null });
  }

  try {
    await connectToDatabase();
    const staff = await Staff.findById(staffId).lean<{
      _id: unknown;
      username: string;
      name: string;
      active: boolean;
    }>();

    if (!staff || !staff.active) {
      return NextResponse.json({ staff: null });
    }

    return NextResponse.json({
      staff: {
        id: String(staff._id),
        username: staff.username,
        name: staff.name,
      },
    });
  } catch (err) {
    console.error("GET /api/staff/me failed", err);
    return NextResponse.json({ staff: null });
  }
}
