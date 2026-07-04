import { connectToDatabase } from "@/lib/db";
import { Staff } from "@/models/Staff";
import { getStaffIdFromSession } from "@/lib/staffAuth";

export interface ActiveStaff {
  _id: unknown;
  username: string;
  name: string;
  active: boolean;
}

/**
 * Resolve the currently signed-in, still-active billing staff.
 * Returns null when there is no valid session or the account is disabled.
 * Ensures a DB connection as a side effect.
 */
export async function requireActiveStaff(): Promise<ActiveStaff | null> {
  const staffId = await getStaffIdFromSession();
  if (!staffId) return null;
  await connectToDatabase();
  const staff = await Staff.findById(staffId).lean<ActiveStaff>();
  if (!staff || !staff.active) return null;
  return staff;
}
