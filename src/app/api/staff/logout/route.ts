import { NextResponse } from "next/server";
import { destroyStaffSession } from "@/lib/staffAuth";

// POST /api/staff/logout — end the current billing-staff session.
export async function POST() {
  await destroyStaffSession();
  return NextResponse.json({ ok: true });
}
