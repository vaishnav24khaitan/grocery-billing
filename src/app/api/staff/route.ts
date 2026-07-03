import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Staff } from "@/models/Staff";
import { isAdminAuthenticated } from "@/lib/auth";
import { hashPassword } from "@/lib/staffAuth";

interface StaffLean {
  _id: unknown;
  username: string;
  name: string;
  active: boolean;
  createdAt?: Date;
}

function serialize(s: StaffLean) {
  return {
    _id: String(s._id),
    username: s.username,
    name: s.name,
    active: s.active,
    createdAt: s.createdAt ? s.createdAt.toISOString() : undefined,
  };
}

// GET /api/staff — admin: list all billing staff (no password hashes).
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const staff = await Staff.find({})
      .sort({ createdAt: -1 })
      .lean<StaffLean[]>();
    return NextResponse.json(staff.map(serialize));
  } catch (err) {
    console.error("GET /api/staff failed", err);
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }
}

// POST /api/staff — admin: create a billing-staff account.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { username?: unknown; name?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !name || !password) {
    return NextResponse.json(
      { error: "username, name and password are required" },
      { status: 400 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const existing = await Staff.findOne({ username }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "That username is already taken" },
        { status: 409 }
      );
    }
    const created = await Staff.create({
      username,
      name,
      passwordHash: hashPassword(password),
      active: true,
    });
    return NextResponse.json(
      serialize(created.toObject() as StaffLean),
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/staff failed", err);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
