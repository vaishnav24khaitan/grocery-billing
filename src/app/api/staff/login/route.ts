import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Staff } from "@/models/Staff";
import { verifyStaffPassword, createStaffSession } from "@/lib/staffAuth";

// POST /api/staff/login — billing staff sign in with username + password.
export async function POST(request: Request) {
  let username = "";
  let password = "";
  try {
    const body = await request.json();
    username =
      typeof body?.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const staff = await Staff.findOne({ username }).lean<{
      _id: unknown;
      username: string;
      name: string;
      passwordHash: string;
      active: boolean;
    }>();

    if (
      !staff ||
      !staff.active ||
      !verifyStaffPassword(password, staff.passwordHash)
    ) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const id = String(staff._id);
    await createStaffSession(id);
    return NextResponse.json({
      id,
      username: staff.username,
      name: staff.name,
    });
  } catch (err) {
    console.error("POST /api/staff/login failed", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
